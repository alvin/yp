// Story: spec/features/provide-print-paths.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, type Fixture } from '../helpers/db';

let page: Page;
let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('provide print paths', () => {
	it('links every operational report from the print centre', async () => {
		await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
		for (const slug of ['housekeeping', 'in-house', 'kitchen', 'manual-sales', 'cancellation-list']) {
			expect(await page.locator(`a[href*="/reports/${slug}"]`).count()).toBeGreaterThan(0);
		}
	});

	it('links daily cash from the print centre', async () => {
		expect(await page.locator('a[href*="/reports/dcar"]').count()).toBeGreaterThan(0);
	});

	it('prints guest documents from the reservation itself', async () => {
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		for (const slug of ['confirmation', 'check-in-folio', 'checkout-bill', 'cancellation']) {
			expect(await page.locator(`a[href="/reports/${slug}/${fx.resnumber}"]`).count()).toBe(1);
		}
	});
});
