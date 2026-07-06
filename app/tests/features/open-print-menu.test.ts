// Story: spec/features/open-print-menu.feature
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

describe('open print menu', () => {
	it('reaches the print centre directly from the lookup home screen', async () => {
		await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
		await page.click('a[href="/print"]:has-text("Print Center")');
		await page.waitForURL(/\/print$/, { timeout: 15_000 });
	});

	it('groups daily reports and guest documents', async () => {
		const body = await page.textContent('body');
		expect(body).toContain('Guest documents');
		expect(body).toContain('Housekeeping');
		expect(body).toContain('Confirmation');
	});

	it('supports batch-for-a-day and individual printing modes', async () => {
		const body = await page.textContent('body');
		expect(body).toMatch(/Batch print/i);
		expect(body).toMatch(/Tomorrow/);
		expect(await page.isVisible('input[inputmode=numeric], input#ind-res, input[placeholder*="eservation"]')).toBe(true);
	});
});
