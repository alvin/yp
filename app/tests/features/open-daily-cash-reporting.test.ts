// Story: spec/features/open-daily-cash-reporting.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';

let page: Page;

beforeAll(async () => {
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('open daily cash reporting', () => {
	it('reaches daily cash directly from the lookup home screen', async () => {
		await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
		await page.click('a[href="/reports/dcar"]:has-text("Daily Cash Report")');
		await page.waitForURL(/\/reports\/dcar/, { timeout: 15_000 });
		expect(await page.textContent('.report-page')).toContain('Daily Cash Activity Report');
	});

	it('keeps the appendices one tab away', async () => {
		const tabs = await page.textContent('nav[aria-label="Reports in this workflow"]');
		for (const t of ['Deposits received', 'Deposits applied', 'Cashier detail', 'Items cashed out']) {
			expect(tabs).toContain(t);
		}
	});
});
