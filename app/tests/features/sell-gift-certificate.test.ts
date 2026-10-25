// Story: spec/features/sell-gift-certificate.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { addDays, dcarLine, ledger, makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

let fx: Fixture;
let saleDay: string;
let giftCode: string;

const page = useAppPage();

beforeAll(async () => {
	// Sold at the desk on a daily sales account — a stay already checked out —
	// so the sale is counted the day it is rung up.
	fx = await makeReservation();
	saleDay = addDays(fx.departure, 1);
	const db = await staffClient();
	[{ invcode: giftCode }] = unwrap(
		await db
			.from('inventory_items')
			.select('invcode')
			.eq('invarchive', false)
			.eq('invtype', 'Gift Certificate')
			.order('inventoryid')
			.limit(1)
	) as { invcode: string }[];
});

describe('sell gift certificate', () => {
	it('rings up the sale from the reservation’s transactions: the certificate charged, the money taken', async () => {
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Charge', exact: true }).click();
		await page.getByRole('button', { name: 'Item / extra' }).click();
		await page.click('#c-item');
		await page.keyboard.type(giftCode);
		await page.locator('[data-testid=combobox-list] [role=option]').first().click();
		await page.fill('#c-unit', '300');
		await page.fill('#c-date', saleDay);
		await page.getByRole('button', { name: 'Add charge' }).click();
		await expect.poll(async () => (await ledger(fx.reservationid)).length, { timeout: 10_000 }).toBe(1);

		await page.getByRole('button', { name: 'Payment', exact: true }).click();
		await page.fill('#p-amt', '300');
		await page.fill('#p-date', saleDay);
		await page.getByRole('button', { name: 'Record', exact: true }).click();
		await expect.poll(async () => (await ledger(fx.reservationid)).length, { timeout: 10_000 }).toBe(2);

		const [charge] = (await ledger(fx.reservationid)).filter((l) => l.line_source === 'transaction');
		expect([charge.line_type, Number(charge.amount)]).toEqual(['Gift Certificate', 300]);
	});

	it('counts the sale as a charge on the day it is sold', async () => {
		expect(await dcarLine(saleDay, 'Gift Certificate', 'Revenue')).toBe(300);
		expect(await dcarLine(saleDay, 'Total Sales and Charges')).toBe(300);
	});

	it('takes the money into the day’s receipts, so the day balances', async () => {
		expect(Number(await rpc('report_dcar_receipts_total', { p_date: saleDay }))).toBe(300);
		expect(Number(await rpc('report_dcar_total', { p_date: saleDay }))).toBe(300);
	});
});
