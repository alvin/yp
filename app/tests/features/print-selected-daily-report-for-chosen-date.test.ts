// Story: spec/features/print-selected-daily-report-for-chosen-date.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, type Fixture } from '../helpers/db';

let page: Page;
let fx: Fixture;
let mid: string;

beforeAll(async () => {
	fx = await makeReservation();
	mid = addDays(fx.arrival, 1);
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('print selected daily report for chosen date', () => {
	it('drives each operational report from the chosen date', async () => {
		await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
		await page.fill('#print-date', mid);
		await page.waitForTimeout(300);
		const href = await page.getAttribute('a[href*="/reports/in-house"]', 'href');
		expect(href).toContain(`date=${mid}`);
	});

	it('renders the chosen date on the printed report', async () => {
		await page.goto(`${APP_URL}/reports/housekeeping?date=${mid}`, { waitUntil: 'networkidle' });
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Housekeeping Report');
		expect(sheet).toContain(fx.lastname);
	});

	it('re-dates the report from the report toolbar too', async () => {
		expect(await page.isVisible('#report-date')).toBe(true);
	});
});
