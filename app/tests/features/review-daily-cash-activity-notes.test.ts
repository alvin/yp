// Story: spec/features/review-daily-cash-activity-notes.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { todayISO } from '../helpers/db';

let page: Page;

beforeAll(async () => {
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('review daily cash activity notes', () => {
	it('reaches the notes from the daily cash workspace tabs', async () => {
		await page.goto(`${APP_URL}/reports/dcar?date=${todayISO()}`, { waitUntil: 'networkidle' });
		await page.click('nav[aria-label="Reports in this workflow"] a:has-text("Notes")');
		await page.waitForURL(/dcar-notes/, { timeout: 15_000 });
	});

	it('presents the client’s notes on the daily cash workflow', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Notes on Daily Cash Activity Report');
		expect(sheet).toContain('till tape');
		expect(sheet).toContain('manual adjustments');
	});

	it('prints like the other daily cash documents', async () => {
		expect(await page.isVisible('button:has-text("Print")')).toBe(true);
	});
});
