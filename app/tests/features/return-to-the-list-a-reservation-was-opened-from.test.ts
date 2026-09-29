// Story: spec/features/return-to-the-list-a-reservation-was-opened-from.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, type Fixture } from '../helpers/db';

let page: Page;
let fx: Fixture;

/** Opens the fixture's reservation from the list on screen and backs out. */
async function openAndBack(open: () => Promise<void>): Promise<string> {
	await open();
	await page.waitForURL(`${APP_URL}/reservations/${fx.resnumber}`, { timeout: 15_000 });
	await page.getByRole('button', { name: 'Back', exact: true }).click();
	await page.waitForURL((url) => !url.pathname.startsWith('/reservations/'), { timeout: 15_000 });
	return page.url();
}

beforeAll(async () => {
	fx = await makeReservation();
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('return to the list a reservation was opened from', () => {
	it("returns to the guest's reservations", async () => {
		const list = `${APP_URL}/guests/${fx.guestid}`;
		await page.goto(list, { waitUntil: 'networkidle' });
		const url = await openAndBack(() => page.click(`a[href="/reservations/${fx.resnumber}"]`));
		expect(url).toBe(list);
		expect(await page.textContent('body')).toContain(`#${fx.resnumber}`);
	});

	it('returns to date search results', async () => {
		const list = `${APP_URL}/date?date=${fx.arrival}&mode=arrivals`;
		await page.goto(list, { waitUntil: 'networkidle' });
		const url = await openAndBack(() => page.getByText(fx.lastname).first().click());
		expect(url).toBe(list);
	});

	it('returns to all-fields search results', async () => {
		const list = `${APP_URL}/query?q=${fx.resnumber}`;
		await page.goto(list, { waitUntil: 'networkidle' });
		const url = await openAndBack(() => page.getByText(String(fx.resnumber)).first().click());
		expect(url).toBe(list);
	});

	it('goes to Lookup when the reservation was opened any other way', async () => {
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		expect(await page.getByRole('button', { name: 'Back', exact: true }).count()).toBe(0);
		await page.getByRole('link', { name: 'Lookup' }).click();
		await page.waitForURL(`${APP_URL}/`, { timeout: 15_000 });
	});
});
