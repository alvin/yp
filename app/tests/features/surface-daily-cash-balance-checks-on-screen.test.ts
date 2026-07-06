// Story: spec/features/surface-daily-cash-balance-checks-on-screen.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

let page: Page;
let balancedDay: Fixture;
let unbalancedDay: Fixture;

beforeAll(async () => {
	page = await openAppPage();
	// Balanced day: deposit received is both an upper adjustment and a receipt.
	balancedDay = await makeReservation();
	await rpc('record_payment', {
		p_reservationguestid: balancedDay.reservationguestid,
		p_paymentcategory: 'Deposit (Received)',
		p_paymenttype: 'Visa',
		p_amount: 250,
		p_paymentdate: balancedDay.arrival
	});
	// Unbalanced day: a charge with no matching receipt.
	unbalancedDay = await makeReservation();
	await rpc('post_room_nights', {
		p_reservationguestid: unbalancedDay.reservationguestid,
		p_roomid: (await rpc<{ roomid: number }[]>('room_directory'))[0].roomid,
		p_occupancyin: unbalancedDay.arrival,
		p_occupancyout: unbalancedDay.departure,
		p_rate: 100,
		p_transdate: unbalancedDay.arrival
	});
});

afterAll(async () => {
	await closeApp(page);
});

describe('surface daily cash balance checks on screen', () => {
	it('shows Balanced when the two sections agree', async () => {
		await page.goto(`${APP_URL}/reports/dcar?date=${balancedDay.arrival}`, {
			waitUntil: 'networkidle'
		});
		const toolbar = await page.textContent('.no-print');
		expect(toolbar).toMatch(/Balanced/);
	});

	it('shows the difference when the sections do not agree', async () => {
		await page.goto(`${APP_URL}/reports/dcar?date=${unbalancedDay.arrival}`, {
			waitUntil: 'networkidle'
		});
		const toolbar = await page.textContent('.no-print');
		expect(toolbar).toMatch(/Difference/);
	});

	it('states on each appendix whether it agrees with the daily cash line', async () => {
		await page.goto(`${APP_URL}/reports/deposits-received?date=${balancedDay.arrival}`, {
			waitUntil: 'networkidle'
		});
		const toolbar = await page.textContent('.no-print');
		expect(toolbar).toMatch(/Ties to DCAR/);
		expect(toolbar).toMatch(/Agrees/);
	});

	it('keeps the balance indicators out of the printed sheet', async () => {
		await page.goto(`${APP_URL}/reports/dcar?date=${balancedDay.arrival}`, {
			waitUntil: 'networkidle'
		});
		const printed = await page.textContent('.report-page');
		expect(printed).not.toMatch(/Balanced/);
	});

	it('keeps one business date while moving between the workspace tabs', async () => {
		await page.goto(`${APP_URL}/reports/dcar?date=${balancedDay.arrival}`, {
			waitUntil: 'networkidle'
		});
		await page.click('nav[aria-label="Reports in this workflow"] a:has-text("Cashier detail")');
		await page.waitForURL(new RegExp(`cashier-detail\\?date=${balancedDay.arrival}`), {
			timeout: 15_000
		});
		expect(page.url()).toContain(balancedDay.arrival);
	});
});
