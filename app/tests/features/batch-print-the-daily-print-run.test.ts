// Story: spec/features/batch-print-the-daily-print-run.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, todayISO } from '../helpers/db';

let page: Page;
const today = todayISO();

beforeAll(async () => {
	// Ensure today's queues have at least one arrival (folio) to batch.
	await makeReservation({ arrival: today, departure: undefined, nights: 2 });
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('batch print the daily print run', () => {
	it('gathers the day’s reports and queued documents together', async () => {
		await page.goto(`${APP_URL}/print/batch?date=${today}`, { waitUntil: 'networkidle' });
		const count = await page.locator('.report-page').count();
		// 4 daily reports at minimum, plus the folio for today's arrival.
		expect(count).toBeGreaterThanOrEqual(5);
		const body = await page.textContent('body');
		expect(body).toContain('Housekeeping Report');
		expect(body).toContain('In House Report');
	});

	it('shows how many pages are ready, broken down by type', async () => {
		await page.goto(`${APP_URL}/print/batch?date=${today}`, { waitUntil: 'networkidle' });
		const toolbar = await page.textContent('.no-print');
		expect(toolbar).toMatch(/\d+ pages ready/);
		expect(toolbar).toMatch(/report/i);
		expect(toolbar).toMatch(/folio/i);
	});

	it('groups the set by paper, each group printing in one action', async () => {
		await page.goto(`${APP_URL}/print/batch?date=${today}`, { waitUntil: 'networkidle' });
		// One print action per stock: reports on letter, guest documents on A5.
		await page.locator('[data-testid=print-letter]').waitFor({ timeout: 15_000 });
		await page.locator('[data-testid=print-a5]').waitFor({ timeout: 15_000 });
		expect(await page.locator('[data-testid=group-letter] .report-page').count()).toBe(4);
		expect(
			await page.locator('[data-testid=group-a5] .report-page').count()
		).toBeGreaterThanOrEqual(1);
		// Page-break styling gives each document its own sheet.
		const css = await page.evaluate(() =>
			Array.from(document.querySelectorAll('style'))
				.map((s) => s.textContent)
				.join('\n')
		);
		expect(css).toContain('page-break-after');
	});

	it('is reachable from the Print Center with a live summary', async () => {
		await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
		const body = await page.textContent('body');
		expect(body).toMatch(/Batch print/i);
		await page.click('a[href*="/print/batch"]');
		await page.waitForURL(/\/print\/batch/, { timeout: 15_000 });
	});
});
