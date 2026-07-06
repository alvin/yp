// Story: spec/features/print-filtered-kitchen-report-for-selected-date.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, type Fixture } from '../helpers/db';

let inside: Fixture;
let page: Page;

beforeAll(async () => {
	inside = await makeReservation();
	await rpc('save_kitchen_meal', { p_guestid: inside.guestid, p_guestdiet: 'Vegetarian' });
});

afterAll(async () => {
	await closeApp(page);
});

describe('print filtered kitchen report for selected date', () => {
	it('selects rows by arrival date within the chosen range', async () => {
		const rows = await rpc<{ resnumber: number }[]>('report_kitchen_meal_filtered', {
			p_from: inside.arrival,
			p_to: inside.arrival
		});
		expect(rows.some((r) => r.resnumber === inside.resnumber)).toBe(true);
	});

	it('excludes stays whose arrival falls outside the range', async () => {
		const rows = await rpc<{ resnumber: number }[]>('report_kitchen_meal_filtered', {
			p_from: addDays(inside.arrival, 1),
			p_to: addDays(inside.arrival, 2)
		});
		expect(rows.some((r) => r.resnumber === inside.resnumber)).toBe(false);
	});

	it('prints the chosen range in the report heading', async () => {
		page = await openAppPage();
		await page.goto(
			`${APP_URL}/reports/kitchen-filtered?from=${inside.arrival}&to=${inside.arrival}`,
			{ waitUntil: 'networkidle' }
		);
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Kitchen Report');
		expect(sheet).toContain('Arrival Date between');
	});
});
