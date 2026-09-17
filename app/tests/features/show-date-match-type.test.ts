// Story: spec/features/show-date-match-type.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, isolatedDate, makeReservation, rpc, type Fixture } from '../helpers/db';

interface DateRow {
	resnumber: number;
	match_type: string;
}

let date: string;
let arriving: Fixture;
let departing: Fixture;

beforeAll(async () => {
	date = isolatedDate();
	// One stay arrives on the date, another departs on it. No rooms so the
	// two stays can share the day without competing for one.
	arriving = await makeReservation({ arrival: date, nights: 2, roomid: null });
	departing = await makeReservation({ arrival: addDays(date, -2), nights: 2, roomid: null });
});

describe('show date match type', () => {
	it('shows whether each stay matches as an arrival or a departure', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', { p_date: date, p_mode: 'both' });
		const arrivalRow = rows.find((r) => r.resnumber === arriving.resnumber);
		const departureRow = rows.find((r) => r.resnumber === departing.resnumber);
		expect(arrivalRow?.match_type).toBe('arrival');
		expect(departureRow?.match_type).toBe('departure');
	});

	it('makes the match type visible on the row without opening the reservation', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', { p_date: date, p_mode: 'both' });
		expect(rows.length).toBeGreaterThanOrEqual(2);
		for (const row of rows) {
			expect(['arrival', 'departure', 'in_house']).toContain(row.match_type);
		}
	});

	it('breaks a list of several kinds into a section per kind, in the order the day runs', async () => {
		const page = await openAppPage();
		try {
			await page.goto(`${APP_URL}/date?date=${date}&mode=both`, { waitUntil: 'networkidle' });
			expect(await page.locator('h2').allTextContents()).toEqual(['Arrivals', 'Departures']);
			// The heading says which kind a row is, so the row does not repeat it.
			const headers = await page.locator('thead th').allTextContents();
			expect(headers).not.toContain('Match');
		} finally {
			await closeApp(page);
		}
	});

	it('leaves a list of one kind unsectioned, labelling the rows instead', async () => {
		const page = await openAppPage();
		try {
			await page.goto(`${APP_URL}/date?date=${date}&mode=arrivals`, {
				waitUntil: 'networkidle'
			});
			expect(await page.locator('h2').count()).toBe(0);
			expect(await page.locator('thead th').allTextContents()).toContain('Match');
		} finally {
			await closeApp(page);
		}
	});

	it('matches the reason each stay was returned by the search', async () => {
		// The single-purpose modes return only the stay whose label they match.
		const arrivals = await rpc<DateRow[]>('search_by_date', { p_date: date, p_mode: 'arrivals' });
		expect(arrivals.some((r) => r.resnumber === arriving.resnumber)).toBe(true);
		expect(arrivals.some((r) => r.resnumber === departing.resnumber)).toBe(false);
		const departures = await rpc<DateRow[]>('search_by_date', {
			p_date: date,
			p_mode: 'departures'
		});
		expect(departures.some((r) => r.resnumber === departing.resnumber)).toBe(true);
		expect(departures.some((r) => r.resnumber === arriving.resnumber)).toBe(false);
	});
});
