// Story: spec/features/open-the-lookup-home-screen.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';

let page: Page;

beforeAll(async () => {
	page = await openAppPage();
	await page.goto(APP_URL + '/', { waitUntil: 'networkidle' });
});

afterAll(async () => {
	await closeApp(page);
});

describe('open the lookup home screen', () => {
	it('shows inputs for guest name, reservation number, and date search', async () => {
		await page.getByRole('tab', { name: 'Name', exact: true }).click();
		expect(await page.locator('#name-q').isVisible()).toBe(true);
		await page.getByRole('tab', { name: 'Res #', exact: true }).click();
		expect(await page.locator('#res-q').isVisible()).toBe(true);
		await page.getByRole('tab', { name: 'Date', exact: true }).click();
		expect(await page.locator('#date-q').isVisible()).toBe(true);
	});

	it('shows a New Reservation action', async () => {
		const link = page.locator('a:has-text("New reservation")').first();
		expect(await link.isVisible()).toBe(true);
		expect(await link.getAttribute('href')).toBe('/reservations/new');
	});

	it('shows Print Center and Daily Cash Report actions', async () => {
		const print = page.locator('a:has-text("Print Center")').first();
		expect(await print.isVisible()).toBe(true);
		expect(await print.getAttribute('href')).toBe('/print');
		const cash = page.locator('a:has-text("Daily Cash Report")').first();
		expect(await cash.isVisible()).toBe(true);
		expect(await cash.getAttribute('href')).toBe('/reports/dcar');
	});

	it('shows a search-all-fields action', async () => {
		await page.getByRole('tab', { name: 'All fields', exact: true }).click();
		expect(await page.locator('#all-q').isVisible()).toBe(true);
	});
});
