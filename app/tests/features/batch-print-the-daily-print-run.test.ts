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

/** The @page rules the screen currently carries. */
async function pageRule(p: Page): Promise<string> {
	return p.evaluate(() =>
		Array.from(document.querySelectorAll('style'))
			.map((s) => s.textContent ?? '')
			.filter((t) => t.includes('@page'))
			.join('\n')
	);
}

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

describe('batch print the daily print run — each group on its own paper', () => {
	let stockPage: Page;

	beforeAll(async () => {
		// An arrival today puts at least one guest document in the batch.
		await makeReservation({ arrival: today, nights: 2 });
		stockPage = await openAppPage();
		await stockPage.goto(`${APP_URL}/print/batch?date=${today}`, { waitUntil: 'networkidle' });
	});

	afterAll(async () => {
		await closeApp(stockPage);
	});

	it('groups the batch by the paper each document prints on', async () => {
		const body = await stockPage.textContent('body');
		expect(body).toContain('Reports');
		expect(body).toContain('Folios');
		expect(await stockPage.locator('[data-testid=group-letter]').count()).toBe(1);
		expect(await stockPage.locator('[data-testid=group-a5]').count()).toBe(1);
	});

	it('shows how many pages each group holds and prints it on its own', async () => {
		const letter = await stockPage.textContent('[data-testid=group-letter] .batch-heading');
		expect(letter).toMatch(/letter · 4 pages/);
		const a5 = await stockPage.textContent('[data-testid=group-a5] .batch-heading');
		expect(a5).toMatch(/A5 · \d+ pages/);
		await stockPage.locator('[data-testid=print-letter]').waitFor({ timeout: 15_000 });
		await stockPage.locator('[data-testid=print-a5]').waitFor({ timeout: 15_000 });
	});

	it('prints daily reports on letter and guest documents on folio paper', async () => {
		// Nothing is being printed yet, so the sheet is laid out for letter.
		expect(await pageRule(stockPage)).toContain('size: letter');

		// window.print() blocks the page in a real browser; stand in for it so
		// the test can read the rules in force at the moment printing starts.
		await stockPage.evaluate(() => {
			const w = window as unknown as { __atPrint?: string };
			w.__atPrint = undefined;
			window.print = () => {
				w.__atPrint = Array.from(document.querySelectorAll('style'))
					.map((s) => s.textContent ?? '')
					.filter((t) => t.includes('@page'))
					.join('\n');
			};
		});

		const ruleAtPrint = async (testid: string): Promise<string> => {
			await stockPage.click(`[data-testid=${testid}]`);
			return stockPage.evaluate(
				() => (window as unknown as { __atPrint?: string }).__atPrint ?? ''
			);
		};

		const a5 = await ruleAtPrint('print-a5');
		expect(a5).toContain('size: A5');
		// Only the folios go with it.
		expect(a5).toContain('.batch-group:not([data-stock="a5"]) { display: none');

		const letter = await ruleAtPrint('print-letter');
		expect(letter).toContain('size: letter');
		expect(letter).toContain('.batch-group:not([data-stock="letter"]) { display: none');
	});
});
