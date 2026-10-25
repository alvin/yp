// Story: spec/features/remove-a-charge-entered-in-error.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, printedDate, useAppPage } from '../helpers/app';
import {
	archiveCharge,
	dcarLine,
	isolatedDate,
	ledger,
	makeReservation,
	pay,
	postCharge,
	pricedItem,
	rpc,
	staffClient,
	unwrap,
	type Fixture,
	type Item
} from '../helpers/db';

let fx: Fixture;
let item: Item;
let chargeId: number;
let paymentId: number;
let payDate: string;

const page = useAppPage();
const balance = async (reservationid = fx.reservationid) =>
	Number(await rpc('reservation_balance', { p_reservationid: reservationid }));
const onCashierDetail = async () =>
	(await rpc<{ resnumber: number }[]>('report_cashier_detail', { p_date: payDate })).some(
		(r) => r.resnumber === fx.resnumber
	);

beforeAll(async () => {
	item = await pricedItem();
	fx = await makeReservation();
	payDate = isolatedDate();
	chargeId = await postCharge(fx, { inventoryid: item.inventoryid, quantity: 2, amount: 40 });
	paymentId = await pay(fx, 'Deposit (Received)', 100, { date: payDate });
});

describe('remove a charge entered in error', () => {
	it('takes a charge line off the reservation, its balance and the daily cash report', async () => {
		expect(await balance()).toBe(-60);
		expect(await dcarLine(fx.departure, 'Total Sales and Charges')).toBe(40);

		await archiveCharge(chargeId);

		expect((await ledger(fx.reservationid)).map((l) => l.line_source)).toEqual(['payment']);
		expect(await balance()).toBe(-100);
		expect(await dcarLine(fx.departure, 'Total Sales and Charges')).toBe(0);
	});

	it('takes a payment or deposit line off the same way, and off the daily cash report', async () => {
		expect(await onCashierDetail()).toBe(true);
		await rpc('archive_payment', { p_paymentid: paymentId });
		expect(await ledger(fx.reservationid)).toEqual([]);
		expect(await balance()).toBe(0);
		expect(await onCashierDetail()).toBe(false);
		expect(await dcarLine(payDate, 'Deposit (Received)', 'Adjustments')).toBe(0);
	});

	it('archives the line rather than deleting it, so the correction stays on record', async () => {
		const db = await staffClient();
		const [trans] = unwrap(
			await db.from('transactions').select('transarchive').eq('transactionid', chargeId)
		) as { transarchive: boolean }[];
		const [payment] = unwrap(
			await db.from('payments').select('paymentarchive').eq('paymentid', paymentId)
		) as { paymentarchive: boolean }[];
		expect([trans?.transarchive, payment?.paymentarchive]).toEqual([true, true]);
	});

	it('reports removing a line that has already gone instead of silently doing nothing', async () => {
		await expect(rpc('archive_transaction', { p_transactionid: -1 })).rejects.toThrow(/not found/i);
		await expect(rpc('archive_payment', { p_paymentid: -1 })).rejects.toThrow(/not found/i);
		await expect(archiveCharge(chargeId)).rejects.toThrow(/already removed/i);
		await expect(rpc('archive_payment', { p_paymentid: paymentId })).rejects.toThrow(
			/already removed/i
		);
	});

	it('shows the line being removed and removes it only once confirmed', async () => {
		const doomed = await makeReservation();
		await postCharge(doomed, { inventoryid: item.inventoryid, amount: 25 });

		await page.goto(APP_URL + `/reservations/${doomed.resnumber}`, { waitUntil: 'networkidle' });
		const rows = page.locator('table tbody tr');
		await expect.poll(() => rows.count(), { timeout: 15_000 }).toBe(1);
		const row = rows.first();
		await row.hover();
		await row.locator('button[aria-label^="Remove "]').click();

		const dialog = page.getByRole('dialog');
		await expect.poll(() => dialog.textContent(), { timeout: 10_000 }).toContain('Remove this charge?');
		const shown = (await dialog.textContent()) ?? '';
		expect(shown).toContain('$25.00');
		expect(shown).toContain(printedDate(doomed.arrival));
		expect(shown).toContain(item.invcode);
		await dialog.getByRole('button', { name: 'Keep it' }).click();
		expect(await ledger(doomed.reservationid)).toHaveLength(1);

		await row.hover();
		await row.locator('button[aria-label^="Remove "]').click();
		await page.getByRole('button', { name: 'Remove line', exact: true }).click();
		await expect
			.poll(async () => (await ledger(doomed.reservationid)).length, { timeout: 15_000 })
			.toBe(0);
		await expect.poll(() => page.locator('text=No transactions yet').count()).toBe(1);
	});
});
