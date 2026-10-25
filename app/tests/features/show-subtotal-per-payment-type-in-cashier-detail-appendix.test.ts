// Story: spec/features/show-subtotal-per-payment-type-in-cashier-detail-appendix.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { makeReservation, pay, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;

const page = useAppPage();

beforeAll(async () => {
	fx = await makeReservation();
	// Taken out of type order, so the grouping can only come from the report.
	await pay(fx, 'Payment (Regular)', 120, { type: 'Visa' });
	await pay(fx, 'Payment (Regular)', 55, { type: 'Cash' });
	await pay(fx, 'Payment (Regular)', 30, { type: 'Visa' });
	await page.goto(`${APP_URL}/reports/cashier-detail?date=${fx.arrival}`, { waitUntil: 'networkidle' });
});

describe('show subtotal per payment type in cashier detail appendix', () => {
	it('lists the receipts by payment type, each type closed by its subtotal, the day by its total', async () => {
		const rows = page.locator('.report-page tbody tr');
		await expect.poll(() => rows.count(), { timeout: 10_000 }).toBe(6);
		const printed = await rows.evaluateAll((trs) =>
			trs.map((tr) => {
				const cells = Array.from(tr.children).map((c) => (c as HTMLElement).innerText.trim());
				return [cells[0], cells[4]];
			})
		);
		expect(printed).toEqual([
			['Cash', '$55.00'],
			['Cash Subtotal', '$55.00'],
			['Visa', '$120.00'],
			['Visa', '$30.00'],
			['Visa Subtotal', '$150.00'],
			['Total', '$205.00']
		]);
	});

	it("totals to the day's receipts on the Daily Cash Activity Report", async () => {
		expect(Number(await rpc('report_dcar_receipts_total', { p_date: fx.arrival }))).toBe(205);
	});
});
