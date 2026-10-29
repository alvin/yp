// Story: spec/features/print-housekeeping-report.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, printedDate, printedDay, useAppPage } from '../helpers/app';
import { addDays, isolatedDate, makeReservation, roomDirectory, rpc, type Fixture, type RoomRow } from '../helpers/db';

interface HkRow {
	status: string;
	resnumber: number;
	guest: string;
	guest_count: number;
	room: string;
	in_date: string;
	out_date: string;
	note_date: string | null;
	notes: string | null;
}

let day: string;
let rooms: RoomRow[];
let arriving: Fixture;
let staying: Fixture;
let leaving: Fixture;
let rows: HkRow[];

beforeAll(async () => {
	// Booked out of room order: the report puts them back in it.
	day = isolatedDate();
	rooms = (await roomDirectory()).slice(0, 3);
	leaving = await makeReservation({ arrival: addDays(day, -2), departure: day, roomid: rooms[2].roomid });
	arriving = await makeReservation({ arrival: day, roomid: rooms[0].roomid });
	staying = await makeReservation({ arrival: addDays(day, -1), departure: addDays(day, 1), roomid: rooms[1].roomid });
	for (const [notes, date] of [
		['Twin beds', addDays(day, -3)],
		['Split beds', addDays(day, -1)]
	])
		await rpc('add_housekeeping_note', {
			p_reservationguestid: staying.reservationguestid,
			p_notes: notes,
			p_date: date
		});
	rows = await rpc<HkRow[]>('report_housekeeping', { p_date: day });
});

describe('print housekeeping report', () => {
	it("lists the day's rooms in lodge order, each with its status", () => {
		expect(rows.map((r) => [r.room, r.resnumber, r.status])).toEqual([
			[rooms[0].room, arriving.resnumber, 'Arrive Today'],
			[rooms[1].room, staying.resnumber, 'In House'],
			[rooms[2].room, leaving.resnumber, 'Depart Today']
		]);
	});

	it('lists each room with its guest, guest count and stay dates', () => {
		expect(rows[1]).toMatchObject({
			guest_count: 2,
			in_date: staying.arrival,
			out_date: staying.departure
		});
		expect(rows[1].guest.toUpperCase()).toContain(staying.lastname.toUpperCase());
	});

	it('shows the latest housekeeping note with the date it was written', () => {
		expect(rows[1]).toMatchObject({ notes: 'Split beds', note_date: addDays(day, -1) });
		expect(rows[0]).toMatchObject({ notes: null, note_date: null });
	});

	describe('on paper', () => {
		const page = useAppPage();

		beforeAll(async () => {
			await page.goto(`${APP_URL}/reports/housekeeping?date=${day}`, { waitUntil: 'networkidle' });
		});

		it('starts each line with the room, and prints no reservation number', async () => {
			expect(await page.locator('.report-page thead th').allTextContents()).toEqual([
				'Room:',
				'Status:',
				'Guest:',
				'Count:',
				'In:',
				'Out:',
				'Note Date:',
				'Notes:'
			]);
			expect(await page.locator('.report-page tbody tr').nth(1).locator('td').allTextContents()).toEqual([
				rooms[1].room,
				'In House',
				rows[1].guest,
				'2',
				printedDay(staying.arrival),
				printedDay(staying.departure),
				// A note can date from an earlier stay, so its date keeps the year.
				printedDate(addDays(day, -1)),
				'Split beds'
			]);
		});

		it('ends on Total Guests: those arriving and staying on, not those departing', async () => {
			// Two arriving and two staying on; the two departing aren't counted.
			expect(await page.textContent('.report-page')).toMatch(/Total Guests\s*4\b/);
		});
	});
});
