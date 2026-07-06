// Story: spec/features/show-receipts-converted-to-canadian-dollars.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, rpc, todayISO, type Fixture } from '../helpers/db';

let fx: Fixture;
let page: Page;
let rate: number;

beforeAll(async () => {
	fx = await makeReservation();
	rate = Number(await rpc('effective_exchange_rate', { p_date: todayISO() }));
	// Paid in US funds today so the dated exchange table applies.
	await rpc('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: 'Payment (Regular)',
		p_paymenttype: 'U.S. Cash',
		p_amount: 100,
		p_currency: 'US',
		p_paymentdate: todayISO()
	});
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('show receipts converted to Canadian dollars', () => {
	it('reports the US receipt at its Canadian value', async () => {
		const rows = await rpc<{ resnumber: number; amount: number }[]>('report_cashier_detail', {
			p_date: todayISO()
		});
		const mine = rows.find((r) => r.resnumber === fx.resnumber);
		expect(Number(mine?.amount)).toBeCloseTo(Math.round(100 * rate * 100) / 100, 2);
	});

	it('declares the conversion on the printed cash sheet', async () => {
		await page.goto(`${APP_URL}/reports/dcar?date=${todayISO()}`, { waitUntil: 'networkidle' });
		expect(await page.textContent('.report-page')).toContain('All US amounts converted to Cdn');
	});
});
