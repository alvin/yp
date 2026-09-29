// Story: spec/features/print-filtered-kitchen-report-for-selected-date.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

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

describe('print filtered kitchen report for selected date — blank records', () => {
	it('leaves out a diet record with neither a diet nor notes', async () => {
		const blank = await makeReservation();
		const db = await staffClient();
		unwrap(
			await db
				.from('kitchen_meals')
				.insert({ guestid: blank.guestid, guestdiet: '', kitchenmealnotes: '  ', kmarchive: false })
				.select('kitchenmealid')
		);
		const rows = await rpc<{ resnumber: number }[]>('report_kitchen_meal_filtered', {
			p_from: blank.arrival,
			p_to: blank.arrival
		});
		expect(rows.map((r) => r.resnumber)).not.toContain(blank.resnumber);

		await rpc('save_kitchen_meal', { p_guestid: blank.guestid, p_guestdiet: 'Vegan', p_notes: '' });
		const withDiet = await rpc<{ resnumber: number }[]>('report_kitchen_meal_filtered', {
			p_from: blank.arrival,
			p_to: blank.arrival
		});
		expect(withDiet.map((r) => r.resnumber)).toContain(blank.resnumber);
	});
});
