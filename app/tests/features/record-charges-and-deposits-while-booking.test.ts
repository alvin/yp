// Story: spec/features/record-charges-and-deposits-while-booking.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { addDays, ledger, pricedItem, reservationIdOf, rpc, todayISO, uid, type Item } from '../helpers/db';

const DEPOSIT = 150;

const page = useAppPage();
let item: Item;
let surname: string;
let resnumber: number;

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
	item = await pricedItem();
	surname = `ZZBasket${uid()}`;
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

		const lines = await ledger(await reservationIdOf(resnumber));
		const charge = lines.find((l) => l.line_source === 'transaction');
		const deposit = lines.find((l) => l.line_type === 'Deposit (Received)');

		expect(charge, 'the charge posted with the booking').toBeDefined();
		expect(charge!.code).toBe(item.invcode);
		expect(Number(charge!.quantity)).toBe(2);
		expect(Number(charge!.amount)).toBeCloseTo(Number(item.invamount) * 2, 2);

		expect(deposit, 'the deposit posted with the booking').toBeDefined();
		expect(Number(deposit!.amount)).toBeCloseTo(DEPOSIT, 2);
	});

	it('dates the lines the day they were taken: the deposit on that day’s cash, the charge at check-out', async () => {
		const reservationid = await reservationIdOf(resnumber);
		const lines = await ledger(reservationid);
		expect(lines.map((l) => l.line_date.slice(0, 10))).toEqual([todayISO(), todayISO()]);

		const deposits = await rpc<{ resnumber: number; pymt_cdn: number }[]>('report_deposits_received', {
			p_date: todayISO()
		});
		expect(deposits.filter((d) => d.resnumber === resnumber).map((d) => Number(d.pymt_cdn))).toEqual([
			DEPOSIT
		]);
		const cashedOut = async (date: string) =>
			(await rpc<{ resnumber: number }[]>('report_items_cashed_out', { p_date: date })).filter(
				(r) => r.resnumber === resnumber
			).length;
		expect(await cashedOut(todayISO())).toBe(0);
		expect(await cashedOut(addDays(todayISO(), 33))).toBe(1);
	});
});
