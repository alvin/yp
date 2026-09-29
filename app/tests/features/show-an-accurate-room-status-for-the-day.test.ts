// Story: spec/features/show-an-accurate-room-status-for-the-day.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

let fx: Fixture; // four nights, moving rooms on the third day
let moveDate: string;
let rooms: number[];

function status(roomIn: string, roomOut: string, day: string): Promise<string> {
	return rpc<string>('occupancy_status', {
		p_arrival: fx.arrival,
		p_departure: fx.departure,
		p_room_in: roomIn,
		p_room_out: roomOut,
		p_ref_date: day
	});
}

beforeAll(async () => {
	rooms = (await rpc<{ roomid: number }[]>('room_directory')).slice(0, 2).map((r) => r.roomid);
	fx = await makeReservation({ nights: 4, numadults: 2, roomid: rooms[0] });
	moveDate = addDays(fx.arrival, 2);
	const db = await staffClient();
	const [first] = unwrap(
		await db
			.from('room_assignments')
			.select('occupancyid')
			.eq('reservationguestid', fx.reservationguestid)
	) as { occupancyid: number }[];
	await rpc('record_room_move', {
		p_occupancyid: first.occupancyid,
		p_new_roomid: rooms[1],
		p_move_date: moveDate
	});
});

describe('show an accurate room status for the day', () => {
	it('reads Future before a room is reached and Past after it is left', async () => {
		expect(await status(fx.arrival, moveDate, addDays(fx.arrival, -1))).toBe('Future');
		expect(await status(moveDate, fx.departure, fx.arrival)).toBe('Future');
		expect(await status(fx.arrival, moveDate, addDays(moveDate, 1))).toBe('Past');
		expect(await status(moveDate, fx.departure, addDays(fx.departure, 1))).toBe('Past');
	});

	it('reads In House only on a plain day in the room', async () => {
		expect(await status(fx.arrival, moveDate, addDays(fx.arrival, 1))).toBe('In House');
		expect(await status(moveDate, fx.departure, addDays(moveDate, 1))).toBe('In House');
		expect(await status(fx.arrival, moveDate, fx.arrival)).toBe('Arrive Today');
		expect(await status(moveDate, fx.departure, fx.departure)).toBe('Depart Today');
	});

	it('marks the room being left Move Out on the housekeeping report', async () => {
		const rows = await rpc<{ resnumber: number; status: string }[]>('report_housekeeping', {
			p_date: moveDate
		});
		const ours = rows.filter((r) => r.resnumber === fx.resnumber).map((r) => r.status);
		expect(ours.sort()).toEqual(['Move In', 'Move Out']);
	});

	it('runs Move Out beside Move In on the In House report', async () => {
		const rows = await rpc<{ resnumber: number; section: string }[]>('report_in_house', {
			p_date: moveDate
		});
		const rank = ['Arrive Today', 'Move In', 'Move Out', 'In House', 'Depart Today'];
		const seen = rows.map((r) => rank.indexOf(r.section));
		expect(seen.every((n) => n >= 0)).toBe(true);
		expect(seen).toEqual([...seen].sort((a, b) => a - b));
		expect(rows.filter((r) => r.resnumber === fx.resnumber).map((r) => r.section)).toEqual([
			'Move In',
			'Move Out'
		]);
	});
});

describe('show an accurate room status for the day — on screen and paper', () => {
	let page: Page;

	beforeAll(async () => {
		page = await openAppPage();
	});

	afterAll(async () => {
		await closeApp(page);
	});

	it('prints Move Out under its own heading and counts the moving party once', async () => {
		await page.goto(`${APP_URL}/reports/in-house?date=${moveDate}`, { waitUntil: 'networkidle' });
		const headings = await page.locator('.report-page h2').allTextContents();
		expect(headings.indexOf('Move Out')).toBe(headings.indexOf('Move In') + 1);
		const rows = await rpc<{ section: string; guest_count: number }[]>('report_in_house', {
			p_date: moveDate
		});
		const expected = rows
			.filter((r) => r.section !== 'Move Out')
			.reduce((sum, r) => sum + Number(r.guest_count), 0);
		const sheet = (await page.textContent('.report-page')) ?? '';
		expect(sheet).toMatch(new RegExp(`Total Guests\\s*${expected}\\b`));
	});

	it('shows a past stay\'s rooms as Past on the reservation screen', async () => {
		// Fixture stays are historical, so both rooms were left long ago.
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		const card = page.locator('text=Rooms & moves').locator('xpath=ancestor::*[contains(@class,"rounded-xl")][1]');
		const text = (await card.textContent()) ?? '';
		expect(text.match(/Past/g)?.length).toBe(2);
		expect(text).not.toContain('In house');
	});
});
