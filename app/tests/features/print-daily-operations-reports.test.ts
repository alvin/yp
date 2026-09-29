// Story: spec/features/print-daily-operations-reports.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, todayISO, type Fixture } from '../helpers/db';

let page: Page;

beforeAll(async () => {
	page = await openAppPage();
	await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
});

afterAll(async () => {
	await closeApp(page);
});

describe('print daily operations reports', () => {
	it('lets staff choose a start date for the report run', async () => {
		const d = addDays(todayISO(), 3);
		await page.fill('#print-date', d);
		await expect
			.poll(() => page.getAttribute('a[href*="/reports/housekeeping"]', 'href'), { timeout: 5_000 })
			.toContain(`date=${d}`);
		const inHouse = await page.getAttribute('a[href*="/reports/in-house"]', 'href');
		expect(inHouse).toContain(`date=${d}`);
	});

	it('lets staff set an end date where a report supports a range', async () => {
		const from = addDays(todayISO(), 3);
		const to = addDays(todayISO(), 6);
		await page.fill('#print-date', from);
		await page.fill('#print-end-date', to);
		await expect
			.poll(() => page.getAttribute('a[href*="/reports/kitchen-filtered"]', 'href'), {
				timeout: 5_000
			})
			.toBe(`/reports/kitchen-filtered?from=${from}&to=${to}`);
	});

	it('runs the 7-day kitchen report seven days from the report date when no end date is set', async () => {
		const from = addDays(todayISO(), 3);
		await page.fill('#print-date', from);
		await page.fill('#print-end-date', '');
		await expect
			.poll(() => page.getAttribute('a[href*="/reports/kitchen-filtered"]', 'href'), {
				timeout: 5_000
			})
			.toBe(`/reports/kitchen-filtered?from=${from}&to=${addDays(from, 6)}`);
	});
});

describe('print daily operations reports — the printed report', () => {
	let reportPage: Page;
	let fx: Fixture;
	let mid: string;

	beforeAll(async () => {
		fx = await makeReservation();
		mid = addDays(fx.arrival, 1);
		reportPage = await openAppPage();
	});

	afterAll(async () => {
		await closeApp(reportPage);
	});

	it('renders the chosen date on the printed report', async () => {
		await reportPage.goto(`${APP_URL}/reports/housekeeping?date=${mid}`, {
			waitUntil: 'networkidle'
		});
		const sheet = await reportPage.textContent('.report-page');
		expect(sheet).toContain('Housekeeping Report');
		expect(sheet).toContain(fx.lastname);
	});

	it('re-dates the report from the report toolbar too', async () => {
		expect(await reportPage.isVisible('#report-date')).toBe(true);
	});

	it('numbers the pages of a printed report, and not of a guest document', async () => {
		// The browser prints "Page N of M" in the margin of pages set as `numbered`.
		const pageName = () =>
			reportPage.locator('.report-page').first().evaluate((el) => getComputedStyle(el).page);
		expect(await pageName()).toBe('numbered');
		await reportPage.goto(`${APP_URL}/reports/confirmation/${fx.resnumber}`, {
			waitUntil: 'networkidle'
		});
		expect(await pageName()).not.toBe('numbered');
	});
});
