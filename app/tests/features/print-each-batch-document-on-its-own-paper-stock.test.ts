// Story: spec/features/print-each-batch-document-on-its-own-paper-stock.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, todayISO, type Fixture } from '../helpers/db';

let page: Page;
let fx: Fixture;
const today = todayISO();

/** The @page rules the screen currently carries. */
async function pageRule(p: Page): Promise<string> {
	return p.evaluate(() =>
		Array.from(document.querySelectorAll('style'))
			.map((s) => s.textContent ?? '')
			.filter((t) => t.includes('@page'))
			.join('\n')
	);
}

beforeAll(async () => {
	// An arrival today puts at least one guest document in the batch.
	fx = await makeReservation({ arrival: today, nights: 2 });
	page = await openAppPage();
	await page.goto(`${APP_URL}/print/batch?date=${today}`, { waitUntil: 'networkidle' });
});

afterAll(async () => {
	await closeApp(page);
});

describe('print each batch document on its own paper stock', () => {
	it('groups the batch by the paper each document prints on', async () => {
		const body = await page.textContent('body');
		expect(body).toContain('Reports');
		expect(body).toContain('Folios');
		expect(await page.locator('[data-testid=group-letter]').count()).toBe(1);
		expect(await page.locator('[data-testid=group-a5]').count()).toBe(1);
	});

	it('shows how many pages each group holds and prints it on its own', async () => {
		const letter = await page.textContent('[data-testid=group-letter] .batch-heading');
		expect(letter).toMatch(/letter · 4 pages/);
		const a5 = await page.textContent('[data-testid=group-a5] .batch-heading');
		expect(a5).toMatch(/A5 · \d+ pages/);
		await page.locator('[data-testid=print-letter]').waitFor({ timeout: 15_000 });
		await page.locator('[data-testid=print-a5]').waitFor({ timeout: 15_000 });
	});

	it('prints daily reports on letter and guest documents on folio paper', async () => {
		// Nothing is being printed yet, so the sheet is laid out for letter.
		expect(await pageRule(page)).toContain('size: letter');

		// window.print() blocks the page in a real browser; stand in for it so
		// the test can read the rules in force at the moment printing starts.
		await page.evaluate(() => {
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
			await page.click(`[data-testid=${testid}]`);
			return page.evaluate(() => (window as unknown as { __atPrint?: string }).__atPrint ?? '');
		};

		const a5 = await ruleAtPrint('print-a5');
		expect(a5).toContain('size: A5');
		// Only the folios go with it.
		expect(a5).toContain('.batch-group:not([data-stock="a5"]) { display: none');

		const letter = await ruleAtPrint('print-letter');
		expect(letter).toContain('size: letter');
		expect(letter).toContain('.batch-group:not([data-stock="letter"]) { display: none');
	});

	it('prints a single guest document on the same paper as the batch does', async () => {
		await page.goto(`${APP_URL}/reports/check-in-folio/${fx.resnumber}`, {
			waitUntil: 'networkidle'
		});
		expect(await pageRule(page)).toContain('size: A5 portrait');
		await page.goto(`${APP_URL}/reports/in-house?date=${today}`, { waitUntil: 'networkidle' });
		expect(await pageRule(page)).toContain('size: letter landscape');
	});
});
