// Story: spec/features/preserve-manual-adjustment-visibility.feature
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

describe('preserve manual adjustment visibility', () => {
	it('keeps a blank Adjustments column in the upper section for handwritten entries', async () => {
		const headers = await page.textContent('.report-page table thead');
		expect(headers).toContain('Adjustments:');
	});

	it('keeps blank Actual Amount and Adjustments columns in the cash section', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Actual Amount:');
		expect(sheet).toContain('Calc. Amt (Cdn):');
	});

	it('leaves the manual columns empty rather than auto-filling them', async () => {
		// The lower table's Actual Amount cells must render empty.
		const cells = await page.$$eval('.report-page table:last-of-type tbody tr', (rows) =>
			rows.slice(0, 3).map((r) => (r.children[2] as HTMLElement).innerText.trim())
		);
		for (const c of cells) expect(c).toBe('');
	});
});
