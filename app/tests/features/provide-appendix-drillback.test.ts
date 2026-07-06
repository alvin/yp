// Story: spec/features/provide-appendix-drillback.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { isolatedDate } from '../helpers/db';

let page: Page;
const date = isolatedDate();

beforeAll(async () => {
	page = await openAppPage();
	await page.goto(`${APP_URL}/reports/dcar?date=${date}`, { waitUntil: 'networkidle' });
});

afterAll(async () => {
	await closeApp(page);
});

describe('provide appendix drillback', () => {
	it('moves from the DCAR to an appendix keeping the same day', async () => {
		await page.click('nav[aria-label="Reports in this workflow"] a:has-text("Items cashed out")');
		await page.waitForURL(new RegExp(`items-cashed-out\\?date=${date}`), { timeout: 15_000 });
	});

	it('drills back from the appendix to the DCAR for the same day', async () => {
		await page.click(
			'nav[aria-label="Reports in this workflow"] a:has-text("Daily Cash Report")'
		);
		await page.waitForURL(new RegExp(`dcar\\?date=${date}`), { timeout: 15_000 });
		expect(await page.textContent('.report-page h1')).toContain('Daily Cash Activity Report');
	});

	it('keeps every appendix one step from the report', async () => {
		const tabs = await page.textContent('nav[aria-label="Reports in this workflow"]');
		for (const t of ['Deposits received', 'Deposits applied', 'Cashier detail', 'Items cashed out']) {
			expect(tabs).toContain(t);
		}
	});
});
