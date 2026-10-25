// Story: spec/features/change-the-quantity-of-a-charge.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import {
	addDays,
	makeReservation,
	pay,
	postCharge,
	postRoomNights,
	pricedItem,
	rpc,
	staffClient,
	todayISO,
	unwrap,
	type Fixture
} from '../helpers/db';

interface ChargeRow {
	transquantity: number;
	transamount: number;
	transgstamount: number;
	occupancyout: string | null;
}

async function charge(transactionid: number): Promise<ChargeRow> {
	const db = await staffClient();
	const rows = unwrap(
		await db
			.from('transactions')
			.select('transquantity, transamount, transgstamount, occupancyout')
			.eq('transactionid', transactionid)
	) as ChargeRow[];
	return rows[0];
}

let itemId: number;

beforeAll(async () => {
	// An item that carries GST, so the tax can be seen to follow the quantity.
	itemId = (await pricedItem({ gst: true })).inventoryid;
});

function postItem(fx: Fixture, transdate: string): Promise<number> {
	return postCharge(fx, { inventoryid: itemId, transdate, amount: 6 });
}

describe('change the quantity of a charge', () => {
	let fx: Fixture;

	beforeAll(async () => {
		fx = await makeReservation();
	});

	it('keeps the price per unit; the amount and taxes follow', async () => {
		// Posted today, so the dated tax rates apply.
		const id = await postItem(fx, todayISO());
		await rpc('change_charge_quantity', { p_transactionid: id, p_quantity: 8 });
		const line = await charge(id);
		expect(line.transquantity).toBe(8);
		expect(Number(line.transamount)).toBe(48);
		const gst = Number(
			await rpc('effective_tax_rate', { p_taxratetype: 'GST', p_date: todayISO() })
		);
		expect(gst).toBeGreaterThan(0);
		expect(Number(line.transgstamount)).toBeCloseTo(Math.round(48 * gst * 100) / 100, 2);
	});

	it('changes the nights on a room line, and the nights it covers follow', async () => {
		const id = await postRoomNights(fx, 100);
		await rpc('change_charge_quantity', { p_transactionid: id, p_quantity: 2 });
		const line = await charge(id);
		expect(line.transquantity).toBe(2);
		expect(Number(line.transamount)).toBe(200);
		expect(line.occupancyout?.slice(0, 10)).toBe(addDays(fx.arrival, 2));
	});

	it('refuses a quantity under one', async () => {
		const id = await postItem(fx, fx.arrival);
		await expect(
			rpc('change_charge_quantity', { p_transactionid: id, p_quantity: 0 })
		).rejects.toThrow(/at least 1/i);
		expect((await charge(id)).transquantity).toBe(1);
	});

	it('shows the line as changed on the balance, the bill and the daily cash report', async () => {
		const stay = await makeReservation();
		const id = await postItem(stay, stay.arrival);
		await rpc('change_charge_quantity', { p_transactionid: id, p_quantity: 8 });

		expect(Number(await rpc('reservation_balance', { p_reservationid: stay.reservationid }))).toBe(48);
		const bill = await rpc<{ sort_group: string; quantity: number; amount: number }[]>(
			'report_checkout_bill_lines',
			{ p_reservationid: stay.reservationid }
		);
		expect(
			bill.filter((l) => l.sort_group === 'charges').map((l) => [Number(l.quantity), Number(l.amount)])
		).toEqual([[8, 48]]);
		const items = await rpc<{ resnumber: number; quantity: number; total: number }[]>(
			'report_items_cashed_out',
			{ p_date: stay.departure }
		);
		expect(
			items.filter((r) => r.resnumber === stay.resnumber).map((r) => [r.quantity, Number(r.total)])
		).toEqual([[8, 48]]);
	});
});

describe('change the quantity of a charge — the pen', () => {
	const page = useAppPage();

	it('changes a charge line from the reservation’s transactions', async () => {
		const stay = await makeReservation();
		const id = await postItem(stay, stay.arrival);
		await page.goto(`${APP_URL}/reservations/${stay.resnumber}`, { waitUntil: 'networkidle' });
		const rows = page.locator('table tbody tr');
		await expect.poll(() => rows.count(), { timeout: 15_000 }).toBe(1);

		const row = rows.first();
		await row.hover();
		await row.locator('button[aria-label^="Change quantity"]').click();
		const dialog = page.getByRole('dialog');
		await dialog.locator('#q-qty').fill('8');
		await dialog.getByRole('button', { name: 'Change quantity' }).click();

		await expect.poll(async () => (await charge(id)).transquantity, { timeout: 15_000 }).toBe(8);
		await expect.poll(() => rows.first().textContent(), { timeout: 10_000 }).toContain('$48.00');
	});

	it('has no pen on a payment line', async () => {
		const stay = await makeReservation();
		await pay(stay, 'Deposit (Received)', 30);
		await page.goto(`${APP_URL}/reservations/${stay.resnumber}`, { waitUntil: 'networkidle' });
		const rows = page.locator('table tbody tr');
		await expect.poll(() => rows.count(), { timeout: 15_000 }).toBe(1);
		expect(await rows.first().locator('button[aria-label^="Change quantity"]').count()).toBe(0);
		expect(await rows.first().locator('button[aria-label^="Remove "]').count()).toBe(1);
	});
});
