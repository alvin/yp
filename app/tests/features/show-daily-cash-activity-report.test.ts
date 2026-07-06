// Story: spec/features/show-daily-cash-activity-report.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;
let page: Page;

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('post_room_nights', {
		p_reservationguestid: fx.reservationguestid,
		p_roomid: (await rpc<{ roomid: number }[]>('room_directory'))[0].roomid,
		p_occupancyin: fx.arrival,
		p_occupancyout: fx.departure,
		p_rate: 100,
		p_transdate: fx.arrival
	});
	await rpc('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: 'Deposit (Received)',
		p_paymenttype: 'Visa',
		p_amount: 80,
		p_paymentdate: fx.arrival
	});
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('show daily cash activity report', () => {
	it('summarizes the day’s activity in two balancing sections', async () => {
		const summary = await rpc<{ upper_total: number; receipts_total: number }[]>(
			'report_dcar_summary',
			{ p_date: fx.arrival }
		);
		expect(Number(summary[0].upper_total)).toBeGreaterThan(0);
		expect(Number(summary[0].receipts_total)).toBe(80);
	});

	it('renders the printed sheet with both sections for the chosen date', async () => {
		await page.goto(`${APP_URL}/reports/dcar?date=${fx.arrival}`, { waitUntil: 'networkidle' });
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Daily Cash Activity Report');
		expect(sheet).toContain('Total Sales and Charges:');
		expect(sheet).toContain('Type of Cash:');
		expect(sheet).toContain('Total Receipts Today:');
		expect(sheet).toContain('Balance Owed:');
	});
});
