// Story: spec/features/show-subtotal-per-payment-type-in-cashier-detail-appendix.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;
let page: Page;

beforeAll(async () => {
	fx = await makeReservation();
	for (const [type, amount] of [
		['Visa', 100],
		['Cash', 40]
	] as const) {
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Payment (Regular)',
			p_paymenttype: type,
			p_amount: amount,
			p_paymentdate: fx.arrival
		});
	}
	page = await openAppPage();
	await page.goto(`${APP_URL}/reports/cashier-detail?date=${fx.arrival}`, {
		waitUntil: 'networkidle'
	});
});

afterAll(async () => {
	await closeApp(page);
});

describe('show subtotal per payment type in cashier detail appendix', () => {
	it('prints a subtotal row per tender', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Visa Subtotal');
		expect(sheet).toContain('Cash Subtotal');
	});

	it('prints the final total row', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Total');
		expect(sheet).toContain('$140.00');
	});
});
