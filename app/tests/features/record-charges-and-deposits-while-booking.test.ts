// Story: spec/features/record-charges-and-deposits-while-booking.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, staffClient, todayISO, uid, unwrap } from '../helpers/db';

interface LedgerRow {
	line_source: 'transaction' | 'payment';
	line_type: string;
	line_date: string;
	code: string | null;
	quantity: number;
	amount: number;
	balance_effect: number;
}

interface Item {
	inventoryid: number;
	invcode: string;
	invamount: number;
}

const DEPOSIT = 150;

let page: Page;
let item: Item;
let surname: string;
let resnumber: number;

async function ledgerFor(reservationid: number): Promise<LedgerRow[]> {
	return rpc<LedgerRow[]>('reservation_ledger', { p_reservationid: reservationid });
}

async function reservationIdOf(n: number): Promise<number> {
	return (await rpc<{ reservationid: number }[]>('find_reservation', { p_resnumber: n }))[0]
		.reservationid;
}

/** Books a stay from the new-reservation screen with an opening charge and a deposit. */
async function bookWithCharges(): Promise<void> {
	await page.goto(APP_URL + '/reservations/new', { waitUntil: 'networkidle' });
	await page.fill('#ln', surname);
	await page.fill('#fn', 'Deposit');
	await page.fill('#bb', 'QA');
	await page.fill('#arr', addDays(todayISO(), 30));
	await page.fill('#dep', addDays(todayISO(), 33));

	// An item to be charged, found by its code.
	await page.click('#basket-add-item');
	await page.click('#basket-item');
	await page.locator('[data-testid=combobox-list]').waitFor({ timeout: 10_000 });
	await page.keyboard.type(item.invcode);
	await page.locator('[data-testid=combobox-list] [role=option]').first().click();
	await page.fill('#basket-qty', '2');
	await page.getByRole('button', { name: 'Add item', exact: true }).click();

	// The deposit taken over the phone, in the same pass.
	await page.click('#basket-add-payment');
	await page.fill('#basket-amount', String(DEPOSIT));
	await page.getByRole('button', { name: /^Add Deposit/ }).click();

	await expect
		.poll(() => page.locator('[data-testid=basket-lines] li').count(), { timeout: 10_000 })
		.toBe(2);
}

beforeAll(async () => {
	const db = await staffClient();
	item = (
		unwrap(
			await db
				.from('inventory_items')
				.select('inventoryid, invcode, invamount')
				.eq('invarchive', false)
				.gt('invamount', 0)
				.order('invcode')
				.limit(1)
		) as Item[]
	)[0];
	surname = `ZZBasket${uid()}`;
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('record charges and deposits while booking', () => {
	it('takes items to be charged and a deposit while a new reservation is entered', async () => {
		await bookWithCharges();
		const lines = page.locator('[data-testid=basket-lines] li');
		expect(await lines.nth(0).textContent()).toContain(item.invcode);
		expect(await lines.nth(1).textContent()).toContain('Deposit (Received)');
	});

	it('lets a line be removed before the reservation is saved', async () => {
		const lines = page.locator('[data-testid=basket-lines] li');
		await page.locator('button[aria-label^="Remove "]').first().click();
		await expect.poll(() => lines.count(), { timeout: 10_000 }).toBe(1);
		expect(await lines.nth(0).textContent()).toContain('Deposit (Received)');
	});

	it('posts the held lines when the reservation is saved', async () => {
		// Start again so both lines are on the stay that gets saved.
		await bookWithCharges();
		await page.getByRole('button', { name: 'Save reservation' }).click();
		await page.waitForURL(/\/reservations\/\d+$/, { timeout: 30_000 });
		resnumber = Number(page.url().split('/').pop());

		const lines = await ledgerFor(await reservationIdOf(resnumber));
		const charge = lines.find((l) => l.line_source === 'transaction');
		const deposit = lines.find((l) => l.line_type === 'Deposit (Received)');

		expect(charge, 'the charge posted with the booking').toBeDefined();
		expect(charge!.code).toBe(item.invcode);
		expect(Number(charge!.quantity)).toBe(2);
		expect(Number(charge!.amount)).toBeCloseTo(Number(item.invamount) * 2, 2);

		expect(deposit, 'the deposit posted with the booking').toBeDefined();
		expect(Number(deposit!.amount)).toBeCloseTo(DEPOSIT, 2);
	});

	it('dates the posted lines the day the money moved', async () => {
		const lines = await ledgerFor(await reservationIdOf(resnumber));
		const deposit = lines.find((l) => l.line_type === 'Deposit (Received)')!;
		expect(deposit.line_date.slice(0, 10)).toBe(todayISO());
	});

	it('takes charges and a deposit while re-booking, onto the new stay', async () => {
		const fx = await makeReservation({ nights: 2 });
		// A deposit already held on the stay being re-booked from: it stays
		// there, and what is entered while re-booking lands on the new stay.
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: 'Cash',
			p_amount: 80,
			p_currency: 'Canadian',
			p_paymentdate: fx.arrival
		});

		await page.goto(APP_URL + `/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		await page.getByRole('link', { name: 'Re-book', exact: true }).click();
		await page.waitForURL(/\/reservations\/new\?from=\d+$/, { timeout: 20_000 });
		await page.locator('#basket-add-payment').waitFor({ timeout: 10_000 });
		await page.fill('#bb', 'QA');

		await page.click('#basket-add-payment');
		await page.fill('#basket-amount', '60');
		await page.getByRole('button', { name: /^Add Deposit/ }).click();
		await expect
			.poll(() => page.locator('[data-testid=basket-lines] li').count(), { timeout: 10_000 })
			.toBe(1);

		await page.getByRole('button', { name: 'Save reservation' }).click();
		await page.waitForURL(
			(url) => /\/reservations\/\d+$/.test(url.pathname) && !url.pathname.endsWith(`/${fx.resnumber}`),
			{ timeout: 30_000 }
		);

		const rebookedNumber = Number(page.url().split('/').pop());
		const lines = await ledgerFor(await reservationIdOf(rebookedNumber));
		const deposits = lines.filter((l) => l.line_type === 'Deposit (Received)');
		expect(deposits.map((d) => Number(d.amount))).toEqual([60]);
	});
});
