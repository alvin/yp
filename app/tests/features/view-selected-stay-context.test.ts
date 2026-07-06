// Story: spec/features/view-selected-stay-context.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, type Fixture } from '../helpers/db';

let fx: Fixture;
let page: Page;

beforeAll(async () => {
	fx = await makeReservation({ nights: 4 });
	page = await openAppPage();
	await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
});

afterAll(async () => {
	await closeApp(page);
});

describe('view selected stay context', () => {
	it('shows the reservation number and guest', async () => {
		const body = await page.textContent('body');
		expect(body).toContain(`Reservation #${fx.resnumber}`);
		expect(body).toContain(fx.lastname);
	});

	it('shows arrival, departure, and nights', async () => {
		const body = await page.textContent('body');
		expect(body).toContain('Arrival');
		expect(body).toContain('Departure');
		expect(body).toMatch(/Nights\s*4/);
	});

	it('shows party, bed type, and booked-by context', async () => {
		const body = await page.textContent('body');
		expect(body).toMatch(/2 adults/);
		expect(body).toContain('Bed type');
		expect(body).toContain('QA');
	});
});
