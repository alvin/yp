// Story: spec/features/print-daily-cash-activity-report.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, type Fixture } from '../helpers/db';

let fx: Fixture;
let page: Page;

beforeAll(async () => {
	fx = await makeReservation();
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('print daily cash activity report', () => {
	it('offers a print action on the daily cash report', async () => {
		await page.goto(`${APP_URL}/reports/dcar?date=${fx.arrival}`, { waitUntil: 'networkidle' });
		expect(await page.isVisible('button:has-text("Print")')).toBe(true);
	});

	it('prints the report for the selected business date', async () => {
		const sheet = await page.textContent('.report-page h1');
		expect(sheet).toContain('Daily Cash Activity Report for');
	});

	it('keeps the manual-entry columns on the printed sheet', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Adjustments:');
		expect(sheet).toContain('Actual Amount:');
	});
});
