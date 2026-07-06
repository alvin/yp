// Story: spec/features/view-guest-details-for-a-selected-name-match.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, uid, type Fixture } from '../helpers/db';

let fx: Fixture;
let page: Page;

beforeAll(async () => {
	fx = await makeReservation({ lastname: `ZZDetail-${uid()}` });
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('view guest details for a selected name match', () => {
	it('narrows name search and opens the selected guest', async () => {
		await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
		await page.fill('#name-q', fx.lastname.slice(0, 10));
		await page.waitForSelector(`text=${fx.lastname}`, { timeout: 10_000 });
		await page.click(`button:has-text("${fx.lastname}")`);
		await page.waitForURL(/\/guests\/\d+/, { timeout: 15_000 });
	});

	it('shows guest information plus reservation history', async () => {
		const body = await page.textContent('body');
		expect(body).toContain(fx.lastname);
		expect(body).toContain('Past reservations');
		expect(body).toContain(`#${fx.resnumber}`);
	});

	it('leads from a history row to the transaction screen', async () => {
		await page.click(`a[href="/reservations/${fx.resnumber}"]`);
		await page.waitForURL(new RegExp(`/reservations/${fx.resnumber}$`), { timeout: 15_000 });
		const body = await page.textContent('body');
		expect(body).toContain(`Reservation #${fx.resnumber}`);
	});
});
