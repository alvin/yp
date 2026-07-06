// Story: spec/features/print-daily-operations-reports.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, todayISO } from '../helpers/db';

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
		await page.waitForTimeout(300);
		const href = await page.getAttribute('a[href*="/reports/housekeeping"]', 'href');
		expect(href).toContain(`date=${d}`);
	});

	it('lets staff set an end date where a report supports a range', async () => {
		const from = addDays(todayISO(), 3);
		const to = addDays(todayISO(), 6);
		await page.fill('#print-date', from);
		await page.fill('#print-end-date', to);
		await page.waitForTimeout(300);
		const href = await page.getAttribute('a[href*="/reports/kitchen-filtered"]', 'href');
		expect(href).toContain(`from=${from}`);
		expect(href).toContain(`to=${to}`);
	});

	it('explains how the range applies before printing', async () => {
		const body = await page.textContent('body');
		expect(body).toMatch(/range/i);
	});
});
