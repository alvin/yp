// Story: spec/features/show-date-match-type.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { addDays, isolatedDate, makeReservation, searchByDate, type Fixture } from '../helpers/db';

let date: string;
let arriving: Fixture;
let departing: Fixture;

const page = useAppPage();

beforeAll(async () => {
	date = isolatedDate();
	// One stay arrives on the date, another departs on it. No rooms, so the
	// two stays can share the day without competing for one.
	arriving = await makeReservation({ arrival: date, nights: 2, roomid: null });
	departing = await makeReservation({ arrival: addDays(date, -2), nights: 2, roomid: null });
});

describe('show date match type', () => {
	it('returns each stay as an arrival or a departure, by why it was found', async () => {
		const rows = await searchByDate(date, 'both');
		expect(rows.map((r) => [r.resnumber, r.match_type]).sort()).toEqual(
			[
				[arriving.resnumber, 'arrival'],
				[departing.resnumber, 'departure']
			].sort()
		);
		expect((await searchByDate(date, 'arrivals')).map((r) => r.resnumber)).toEqual([arriving.resnumber]);
		expect((await searchByDate(date, 'departures')).map((r) => r.resnumber)).toEqual([
			departing.resnumber
		]);
	});

	it('breaks a list of several kinds into a section per kind, in the order the day runs, rows unlabelled', async () => {
		await page.goto(`${APP_URL}/date?date=${date}&mode=both`, { waitUntil: 'networkidle' });
		await expect.poll(() => page.locator('h2').allTextContents()).toEqual(['Arrivals', 'Departures']);
		const sections = page.locator('.date-list');
		expect(await sections.nth(0).textContent()).toContain(`#${arriving.resnumber}`);
		expect(await sections.nth(1).textContent()).toContain(`#${departing.resnumber}`);
		expect(await page.locator('thead th').allTextContents()).not.toContain('Match');
		expect(await page.locator('tbody [data-slot=badge]').count()).toBe(0);
	});

	it('leaves a list of one kind unsectioned, each row carrying its own label', async () => {
		await page.goto(`${APP_URL}/date?date=${date}&mode=arrivals`, { waitUntil: 'networkidle' });
		await expect.poll(() => page.locator('thead th').allTextContents()).toContain('Match');
		expect(await page.locator('h2').count()).toBe(0);
		expect(await page.locator('tbody tr [data-slot=badge]').allTextContents()).toEqual(['Arrival']);
	});
});
