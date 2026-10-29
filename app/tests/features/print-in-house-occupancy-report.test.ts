// Story: spec/features/print-in-house-occupancy-report.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import {
	addDays,
	firstOccupancyId,
	isolatedDate,
	makeReservation,
	roomDirectory,
	rpc,
	type Fixture,
	type RoomRow
} from '../helpers/db';

interface InHouseRow {
	section: string;
	resnumber: number;
	arrival: string | null;
	guest_count: number;
	room: string;
	in_date: string;
	out_date: string;
	occupancy_notes: string | null;
}

let date: string;
let rooms: RoomRow[];
let arriving: Fixture;
let leaving: Fixture;
let staying: Fixture;
let moving: Fixture;

beforeAll(async () => {
	// One stay arriving on the date, one departing on it, one mid-stay, and one
	// moving rooms on it.
	date = isolatedDate();
	rooms = (await roomDirectory()).slice(0, 5);
	arriving = await makeReservation({ arrival: date, nights: 2, roomid: rooms[0].roomid, numadults: 1 });
	await rpc('update_reservation', { p_reservationid: arriving.reservationid, p_arrivaltime: '4pm' });
	leaving = await makeReservation({ arrival: addDays(date, -2), departure: date, roomid: rooms[1].roomid });
	// An arrival time on a stay that isn't arriving doesn't print.
	await rpc('update_reservation', { p_reservationid: leaving.reservationid, p_arrivaltime: 'noon' });
	staying = await makeReservation({
		arrival: addDays(date, -1),
		departure: addDays(date, 1),
		roomid: rooms[2].roomid,
		numadults: 3
	});
	moving = await makeReservation({
		arrival: addDays(date, -1),
		departure: addDays(date, 2),
		roomid: rooms[3].roomid
	});
	await rpc('record_room_move', {
		p_occupancyid: await firstOccupancyId(moving),
		p_new_roomid: rooms[4].roomid,
		p_move_date: date
	});
});

describe('print in-house occupancy report', () => {
	it("prints the room's occupancy notes and not the guest's requests", async () => {
		await rpc('set_occupancy_notes', {
			p_occupancyid: await firstOccupancyId(staying),
			p_notes: 'Joining Laura'
		});
		await rpc('update_reservation_guest', {
			p_reservationguestid: staying.reservationguestid,
			p_rgnotes: 'Late checkout please'
		});
		const rows = await rpc<InHouseRow[]>('report_in_house', { p_date: date });
		expect(rows.find((r) => r.resnumber === staying.resnumber)?.occupancy_notes).toBe('Joining Laura');
	});

	it('lists each row in its section, in the order the day runs, with its stay context', async () => {
		const rows = await rpc<InHouseRow[]>('report_in_house', { p_date: date });
		expect(
			rows
				.filter((r) => r.resnumber !== moving.resnumber)
				.map((r) => [r.section, r.resnumber, r.arrival, r.guest_count, r.room, r.in_date, r.out_date])
		).toEqual([
			['Arrive Today', arriving.resnumber, '4pm', 1, rooms[0].room, arriving.arrival, arriving.departure],
			['In House', staying.resnumber, null, 3, rooms[2].room, staying.arrival, staying.departure],
			['Depart Today', leaving.resnumber, null, 2, rooms[1].room, leaving.arrival, leaving.departure]
		]);
	});

	it('prints a party moving rooms under In House, the room it leaves above the one it moves into', async () => {
		const rows = await rpc<InHouseRow[]>('report_in_house', { p_date: date });
		expect(rows.map((r) => r.section)).toEqual([
			'Arrive Today',
			'In House',
			'In House',
			'In House',
			'Depart Today'
		]);
		expect(
			rows.filter((r) => r.resnumber === moving.resnumber).map((r) => [r.section, r.room, r.in_date, r.out_date])
		).toEqual([
			['In House', rooms[3].room, moving.arrival, date],
			['In House', rooms[4].room, date, moving.departure]
		]);
	});

	describe('on paper', () => {
		const page = useAppPage();

		beforeAll(async () => {
			await page.goto(`${APP_URL}/reports/in-house?date=${date}`, { waitUntil: 'networkidle' });
		});

		it('prints the guests in each section, and Total Guests as those arriving and in house', async () => {
			// In House: the party of three, and the moving party of two once, though
			// its two rooms are two lines.
			expect(await rpc('in_house_counts', { p_date: date })).toEqual([
				{ arrive_today: 1, depart_today: 2, in_house: 5, total_guests: 6 }
			]);
			expect(await page.textContent('.report-page')).toMatch(
				/Arrive Today\s*1\s+Depart Today\s*2\s+In House\s*5\s+Total Guests\s*6\b/
			);
		});

		it('prints each section under its own heading, the move under In House', async () => {
			const headings = await page.locator('.report-page h2').allTextContents();
			expect(headings).toEqual(['Arrive Today', 'In House', 'Depart Today']);
			// One table per section, so each starts under its own heading.
			expect(await page.locator('.report-page table').count()).toBe(headings.length);
		});

		it('leaves out a section with nothing in it', async () => {
			// The next day nobody arrives.
			await page.goto(`${APP_URL}/reports/in-house?date=${addDays(date, 1)}`, { waitUntil: 'networkidle' });
			expect(await page.locator('.report-page h2').allTextContents()).toEqual(['In House', 'Depart Today']);
			await page.goto(`${APP_URL}/reports/in-house?date=${date}`, { waitUntil: 'networkidle' });
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
