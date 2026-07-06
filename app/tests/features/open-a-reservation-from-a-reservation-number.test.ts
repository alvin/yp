// Story: spec/features/open-a-reservation-from-a-reservation-number.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

let page: Page;
let fx: Fixture;

beforeAll(async () => {
	page = await openAppPage();
	fx = await makeReservation();
});

afterAll(async () => {
	await closeApp(page);
});

describe('open a reservation from a reservation number', () => {
	it('finds the matching reservation record', async () => {
		const rows = await rpc<{ reservationid: number; resnumber: number; guest_name: string }[]>(
			'find_reservation',
			{ p_resnumber: fx.resnumber }
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].reservationid).toBe(fx.reservationid);
		expect(rows[0].guest_name).toContain(fx.lastname);
	});

	it('opens the transaction screen for the entered number', async () => {
		await page.goto(APP_URL + '/', { waitUntil: 'networkidle' });
		await page.getByRole('tab', { name: 'Res #', exact: true }).click();
		await page.fill('#res-q', String(fx.resnumber));
		await page.press('#res-q', 'Enter');
		await page.waitForURL(new RegExp(`/reservations/${fx.resnumber}$`), { timeout: 20_000 });
		expect(page.url()).toContain(`/reservations/${fx.resnumber}`);
	});

	it('carries the reservation number into the transaction screen', async () => {
		// Continues on the page opened by the previous step.
		const heading = await page.textContent('h1');
		expect(heading).toContain(`Reservation #${fx.resnumber}`);
	});
});
