// Story: spec/features/open-the-lookup-home-screen.feature

import { describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { todayISO } from '../helpers/db';

const page = useAppPage('/');

describe('open the lookup home screen', () => {
	it('shows inputs for guest name, reservation number, and date search', async () => {
		for (const [tab, input] of [
			['Name', '#name-q'],
			['Res #', '#res-q'],
			['Date', '#date-q']
		]) {
			await page.getByRole('tab', { name: tab, exact: true }).click();
			await page.locator(input).waitFor({ state: 'visible', timeout: 10_000 });
		}
	});

	it('shows a New Reservation action', async () => {
		const link = page.locator('a:has-text("New reservation")').first();
		expect(await link.getAttribute('href')).toBe('/reservations/new');
	});

	it('shows a search-all-fields action', async () => {
		await page.getByRole('tab', { name: 'All fields', exact: true }).click();
		await page.locator('#all-q').waitFor({ state: 'visible', timeout: 10_000 });
	});

	it('opens the print menu on its own screen: the batch, the daily reports and the guest documents', async () => {
		await page.click('a[href="/print"]:has-text("Print Center")');
		await page.waitForURL(`${APP_URL}/print`, { timeout: 15_000 });
		await page.getByRole('link', { name: /Review & print/ }).waitFor({ timeout: 10_000 });
		for (const report of ['housekeeping', 'in-house', 'kitchen', 'kitchen-filtered', 'manual-sales', 'cancellation-list']) {
			expect(await page.locator(`a[href^="/reports/${report}?"]`).count(), report).toBe(1);
		}
		for (const doc of ['Confirmation', 'Check-in folio', 'Check-out bill', 'Cancellation']) {
			await page.getByRole('tab', { name: doc }).waitFor({ timeout: 10_000 });
		}
		await page.locator('#ind-confirmation').waitFor({ state: 'visible' });
	});

	it("opens today's Daily Cash Activity Report", async () => {
		await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
		await page.click('a[href="/reports/dcar"]:has-text("Daily Cash Report")');
		await page.waitForURL(`${APP_URL}/reports/dcar`, { timeout: 15_000 });
		const today = new Date(`${todayISO()}T12:00:00`).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
		await expect
			.poll(() => page.textContent('.report-page h1'), { timeout: 10_000 })
			.toBe(`Daily Cash Activity Report for ${today}`);
	});
});
