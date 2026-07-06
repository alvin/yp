// Story: spec/features/open-reservation.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, type Fixture } from '../helpers/db';

let page: Page;
let fx: Fixture;

beforeAll(async () => {
	page = await openAppPage();
	fx = await makeReservation();
});

afterAll(async () => {
	await closeApp(page);
});

describe('open reservation', () => {
	it('opens the reservation workspace for a selected stay', async () => {
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		const heading = await page.textContent('h1');
		expect(heading).toContain(`Reservation #${fx.resnumber}`);
	});

	it('shows the workspace tied to the chosen guest', async () => {
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		const body = await page.textContent('body');
		expect(body).toContain(fx.lastname);
		expect(body).toMatch(/Arrival/);
		expect(body).toMatch(/Departure/);
	});

	it('reaches the full reservation workspace directly, without redoing the search', async () => {
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		const body = await page.textContent('body');
		// The ledger and print actions are all there from the deep link alone.
		expect(body).toMatch(/Transactions/);
		expect(body).toMatch(/Confirmation/);
		expect(body).toMatch(/Check-out bill/);
	});
});
