// Story: spec/features/print-filtered-kitchen-report-for-selected-date.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, printedDate, useAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

const DIET = 'No red meat - Pork OK';
const NOTES = 'Kitchen to call the guest on arrival *before* 4pm.';

let inside: Fixture;
let to: string;

const page = useAppPage();

function filtered(from: string, until: string): Promise<{ resnumber: number }[]> {
	return rpc('report_kitchen_meal_filtered', { p_from: from, p_to: until });
}

beforeAll(async () => {
	inside = await makeReservation({ firstname: 'Avery' });
	await rpc('save_kitchen_meal', { p_guestid: inside.guestid, p_guestdiet: DIET, p_notes: NOTES });
	to = addDays(inside.arrival, 2);
});

describe('print filtered kitchen report for selected date', () => {
	it('prints the range chosen in its heading', async () => {
		await page.goto(`${APP_URL}/reports/kitchen-filtered?from=${inside.arrival}&to=${to}`, {
			waitUntil: 'networkidle'
		});
		expect(await page.textContent('.report-page h3')).toBe(
			`Arrival Date between ${printedDate(inside.arrival)} and ${printedDate(to)}`
		);
	});

	it('gives each guest arriving in the range one row, diet and notes in their own columns, as entered', async () => {
		// The dates are this test's alone, so its stay is the only row.
		const rows = page.locator('.report-page tbody tr');
		expect(await rows.count()).toBe(1);
		expect(await rows.first().locator('td').allTextContents()).toEqual([
			String(inside.resnumber),
			inside.lastname,
			'Avery',
			DIET,
			NOTES,
			printedDate(inside.arrival),
			printedDate(inside.departure)
		]);
	});

	it('leaves out a stay arriving outside the range', async () => {
		const rows = await filtered(addDays(inside.arrival, 1), addDays(inside.arrival, 2));
		expect(rows.map((r) => r.resnumber)).not.toContain(inside.resnumber);
	});

	it('leaves out a diet record with neither a diet nor notes', async () => {
		const blank = await makeReservation();
		const db = await staffClient();
		unwrap(
			await db
				.from('kitchen_meals')
				.insert({ guestid: blank.guestid, guestdiet: '', kitchenmealnotes: '  ', kmarchive: false })
				.select('kitchenmealid')
		);
		expect((await filtered(blank.arrival, blank.arrival)).map((r) => r.resnumber)).not.toContain(
			blank.resnumber
		);

		await rpc('save_kitchen_meal', { p_guestid: blank.guestid, p_guestdiet: 'Vegan', p_notes: '' });
		expect((await filtered(blank.arrival, blank.arrival)).map((r) => r.resnumber)).toContain(
			blank.resnumber
		);
	});
});
