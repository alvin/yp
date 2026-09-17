// Story: spec/features/print-in-house-occupancy-report.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, isolatedDate, makeReservation, rpc } from '../helpers/db';

let date: string;
let page: Page;

beforeAll(async () => {
	// One stay arriving on the date, one departing on it, one mid-stay.
	date = isolatedDate();
	const rooms = await rpc<{ roomid: number }[]>('room_directory');
	await makeReservation({ arrival: date, nights: 2, roomid: rooms[0].roomid });
	await makeReservation({ arrival: addDays(date, -2), departure: date, roomid: rooms[1].roomid });
	await makeReservation({ arrival: addDays(date, -1), departure: addDays(date, 1), roomid: rooms[2].roomid });
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('print in-house occupancy report', () => {
	it('groups the day into Arrive Today, Depart Today, and In House', async () => {
		const rows = await rpc<{ section: string }[]>('report_in_house', { p_date: date });
		const sections = new Set(rows.map((r) => r.section));
		expect(sections.has('Arrive Today')).toBe(true);
		expect(sections.has('Depart Today')).toBe(true);
		expect(sections.has('In House')).toBe(true);
	});

	it('carries per-row occupancy context', async () => {
		const rows = await rpc<{ guest_count: number; room: string; in_date: string; out_date: string }[]>(
			'report_in_house',
			{ p_date: date }
		);
		for (const r of rows) {
			expect(Number(r.guest_count)).toBeGreaterThan(0);
			expect(r.room).toBeTruthy();
		}
	});

	it('orders the day the way it runs — arrivals, moves, in house, departures', async () => {
		const rows = await rpc<{ section: string }[]>('report_in_house', { p_date: date });
		const rank = ['Arrive Today', 'Move In', 'In House', 'Depart Today'];
		const seen = rows.map((r) => rank.indexOf(r.section));
		expect(seen).toEqual([...seen].sort((a, b) => a - b));
	});

	it('prints section counts and total guests', async () => {
		await page.goto(`${APP_URL}/reports/in-house?date=${date}`, { waitUntil: 'networkidle' });
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Arrive Today');
		expect(sheet).toContain('Total Guests');
	});

	it('prints each section under its own heading, in the order the day runs', async () => {
		await page.goto(`${APP_URL}/reports/in-house?date=${date}`, { waitUntil: 'networkidle' });
		const headings = await page.locator('.report-page h2').allTextContents();
		expect(headings).toEqual(['Arrive Today', 'In House', 'Depart Today']);
		// One table per section, so each starts under its own heading.
		expect(await page.locator('.report-page table').count()).toBe(headings.length);
	});

	it('does not label a row with its section a second time', async () => {
		await page.goto(`${APP_URL}/reports/in-house?date=${date}`, { waitUntil: 'networkidle' });
		const columns = await page.locator('.report-page thead th').first().textContent();
		expect(columns).not.toContain('Section');
		const firstRow = await page.locator('.report-page tbody tr').first().locator('td').first().textContent();
		expect(firstRow).not.toContain('Arrive Today');
	});

	it('leaves out a section with nothing in it', async () => {
		// Nobody moves rooms on this date, so no Move In section is printed.
		await page.goto(`${APP_URL}/reports/in-house?date=${date}`, { waitUntil: 'networkidle' });
		const headings = await page.locator('.report-page h2').allTextContents();
		expect(headings).not.toContain('Move In');
	});
});
