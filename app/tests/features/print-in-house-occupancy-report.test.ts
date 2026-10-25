// Story: spec/features/print-in-house-occupancy-report.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { addDays, isolatedDate, makeReservation, roomDirectory, rpc, type Fixture, type RoomRow } from '../helpers/db';

interface InHouseRow {
	section: string;
	resnumber: number;
	arrival: string | null;
	guest_count: number;
	room: string;
	in_date: string;
	out_date: string;
}

let date: string;
let rooms: RoomRow[];
let arriving: Fixture;
let leaving: Fixture;
let staying: Fixture;

beforeAll(async () => {
	// One stay arriving on the date, one departing on it, one mid-stay; nobody moves.
	date = isolatedDate();
	rooms = (await roomDirectory()).slice(0, 3);
	arriving = await makeReservation({ arrival: date, nights: 2, roomid: rooms[0].roomid, numadults: 1 });
	await rpc('update_reservation', { p_reservationid: arriving.reservationid, p_arrivaltime: '4pm' });
	leaving = await makeReservation({ arrival: addDays(date, -2), departure: date, roomid: rooms[1].roomid });
	staying = await makeReservation({
		arrival: addDays(date, -1),
		departure: addDays(date, 1),
		roomid: rooms[2].roomid,
		numadults: 3
	});
});

describe('print in-house occupancy report', () => {
	it('lists each row in its section, in the order the day runs, with its stay context', async () => {
		const rows = await rpc<InHouseRow[]>('report_in_house', { p_date: date });
		expect(rows.map((r) => [r.section, r.resnumber, r.arrival, r.guest_count, r.room, r.in_date, r.out_date])).toEqual([
			['Arrive Today', arriving.resnumber, '4pm', 1, rooms[0].room, arriving.arrival, arriving.departure],
			['In House', staying.resnumber, null, 3, rooms[2].room, staying.arrival, staying.departure],
			['Depart Today', leaving.resnumber, null, 2, rooms[1].room, leaving.arrival, leaving.departure]
		]);
	});

	describe('on paper', () => {
		const page = useAppPage();

		beforeAll(async () => {
			await page.goto(`${APP_URL}/reports/in-house?date=${date}`, { waitUntil: 'networkidle' });
		});

		it('prints the section counts and Total Guests', async () => {
			const total = await rpc<number>('guests_in_house', { p_date: date });
			expect(total).toBe(6);
			expect(await page.textContent('.report-page')).toMatch(
				/Arrive Today\s*1\s+Depart Today\s*1\s+In House\s*1\s+Total Guests\s*6\b/
			);
		});

		it('prints each section under its own heading, leaving out an empty one', async () => {
			const headings = await page.locator('.report-page h2').allTextContents();
			expect(headings).toEqual(['Arrive Today', 'In House', 'Depart Today']);
			// One table per section, so each starts under its own heading.
			expect(await page.locator('.report-page table').count()).toBe(headings.length);
		});

		it('does not label a row with its section a second time', async () => {
			const columns = await page.locator('.report-page thead').first().textContent();
			expect(columns).not.toContain('Section');
			const firstRow = await page.locator('.report-page tbody tr').first().textContent();
			expect(firstRow).not.toContain('Arrive Today');
			expect(firstRow).toContain(String(arriving.resnumber));
		});
	});
});
