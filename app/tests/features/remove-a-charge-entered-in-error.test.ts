// Story: spec/features/remove-a-charge-entered-in-error.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { isolatedDate, makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

interface LedgerRow {
	line_source: 'transaction' | 'payment';
	line_id: number;
	line_type: string;
	description: string;
	balance_effect: number;
}

interface CashierRow {
	resnumber: number;
	pymt_category: string;
	amount: number;
}

let page: Page;
let fx: Fixture;
let sundriesId: number;
let chargeId: number;
let paymentId: number;
let payDate: string;

function ledger(reservationid = fx.reservationid): Promise<LedgerRow[]> {
	return rpc<LedgerRow[]>('reservation_ledger', { p_reservationid: reservationid });
}

function balance(): Promise<number> {
	return rpc<number>('reservation_balance', { p_reservationid: fx.reservationid });
}

beforeAll(async () => {
	const db = await staffClient();
	sundriesId = (
		unwrap(
			await db.from('inventory_items').select('inventoryid').eq('invarchive', false).limit(1)
		) as { inventoryid: number }[]
	)[0].inventoryid;

	fx = await makeReservation();
	payDate = isolatedDate();
	chargeId = await rpc<number>('post_charge', {
		p_reservationguestid: fx.reservationguestid,
		p_inventoryid: sundriesId,
		p_quantity: 2,
		p_transdate: fx.arrival,
		p_amount: 40
	});
	paymentId = await rpc<number>('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: 'Deposit (Received)',
		p_paymenttype: 'Visa',
		p_amount: 100,
		p_currency: 'Canadian',
		p_paymentdate: payDate
	});
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('remove a charge entered in error', () => {
	it('removes a charge line from the reservation', async () => {
		const before = await balance();
		expect((await ledger()).some((l) => l.line_source === 'transaction')).toBe(true);

		await rpc('archive_transaction', { p_transactionid: chargeId });

		const lines = await ledger();
		expect(lines.some((l) => l.line_source === 'transaction' && l.line_id === chargeId)).toBe(
			false
		);
		expect(await balance()).toBeLessThan(before);
	});

	it('removes a payment or deposit line the same way', async () => {
		// The deposit is on the day's cash report before it is removed.
		const before = (await rpc<CashierRow[]>('report_cashier_detail', {
			p_date: payDate
		})) as CashierRow[];
		expect(before.some((r) => r.resnumber === fx.resnumber)).toBe(true);

		await rpc('archive_payment', { p_paymentid: paymentId });

		expect((await ledger()).some((l) => l.line_source === 'payment')).toBe(false);
	});

	it('takes the removed line off every report, including daily cash', async () => {
		const rows = (await rpc<CashierRow[]>('report_cashier_detail', {
			p_date: payDate
		})) as CashierRow[];
		expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(false);
	});

	it('archives the line rather than deleting it, so the correction stays on record', async () => {
		const db = await staffClient();
		const trans = unwrap(
			await db.from('transactions').select('transactionid, transarchive').eq('transactionid', chargeId)
		) as { transarchive: boolean }[];
		const pay = unwrap(
			await db.from('payments').select('paymentid, paymentarchive').eq('paymentid', paymentId)
		) as { paymentarchive: boolean }[];
		expect(trans).toHaveLength(1);
		expect(trans[0].transarchive).toBe(true);
		expect(pay).toHaveLength(1);
		expect(pay[0].paymentarchive).toBe(true);
	});

	it('reports removing a line that has already gone instead of silently doing nothing', async () => {
		await expect(rpc('archive_transaction', { p_transactionid: -1 })).rejects.toThrow(/not found/i);
		await expect(rpc('archive_payment', { p_paymentid: -1 })).rejects.toThrow(/not found/i);
	});

	it('removes a line from the reservation screen after confirming', async () => {
		const doomed = await makeReservation();
		await rpc<number>('post_charge', {
			p_reservationguestid: doomed.reservationguestid,
			p_inventoryid: sundriesId,
			p_quantity: 1,
			p_transdate: doomed.arrival,
			p_amount: 25
		});

		await page.goto(APP_URL + `/reservations/${doomed.resnumber}`, { waitUntil: 'networkidle' });
		const rows = page.locator('table tbody tr');
		await expect.poll(() => rows.count(), { timeout: 15_000 }).toBe(1);

		const row = rows.first();
		await row.hover();
		await row.locator('button[aria-label^="Remove "]').click();
		// Nothing is removed until the clerk confirms what they are removing.
		const confirm = page.getByRole('button', { name: 'Remove line', exact: true });
		await confirm.waitFor({ timeout: 10_000 });
		await confirm.click();

		await expect
			.poll(async () => (await ledger(doomed.reservationid)).length, { timeout: 15_000 })
			.toBe(0);
		await expect.poll(() => page.locator('text=No transactions yet').count()).toBe(1);
	});
});
