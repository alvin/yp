// Story: spec/features/list-room-moves-on-the-check-in-folio-and-confirmation.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, type Fixture } from '../helpers/db';

interface StayRoom {
	occupancyid: number;
	room: string;
	in_date: string;
	out_date: string;
	guest_count: number;
}

function stayRooms(reservationid: number): Promise<StayRoom[]> {
	return rpc<StayRoom[]>('report_stay_rooms', { p_reservationid: reservationid });
}

let moved: Fixture; // moves rooms mid-stay
let settled: Fixture; // one room the whole way
let firstRoom: string;
let secondRoom: string;

beforeAll(async () => {
	const rooms = await rpc<{ roomid: number; room: string }[]>('room_directory');
	moved = await makeReservation({ nights: 4, roomid: rooms[0].roomid });
	const assignments = await stayRooms(moved.reservationid);
	await rpc('record_room_move', {
		p_occupancyid: assignments[0].occupancyid,
		p_new_roomid: rooms[1].roomid,
		p_move_date: addDays(moved.arrival, 2)
	});
	firstRoom = rooms[0].room;
	secondRoom = rooms[1].room;

	settled = await makeReservation({ nights: 3, roomid: rooms[2].roomid });
});

describe('list room moves on the check-in folio and confirmation', () => {
	it('lists every room of the stay with its own dates and party size', async () => {
		const rows = await stayRooms(moved.reservationid);
		expect(rows).toHaveLength(2);
		expect(rows[0].out_date).toBe(addDays(moved.arrival, 2));
		expect(rows[1].in_date).toBe(addDays(moved.arrival, 2));
		expect(rows[1].out_date).toBe(moved.departure);
		for (const r of rows) {
			expect(r.room).toBeTruthy();
			expect(Number(r.guest_count)).toBeGreaterThan(0);
		}
	});

	it('lists the rooms in the order the stay occupies them', async () => {
		const rows = await stayRooms(moved.reservationid);
		expect(rows.map((r) => r.in_date)).toEqual([...rows.map((r) => r.in_date)].sort());
		expect(rows[0].room).toBe(firstRoom);
		expect(rows[1].room).toBe(secondRoom);
	});

	it('gives a stay that never moves exactly one room', async () => {
		const rows = await stayRooms(settled.reservationid);
		expect(rows).toHaveLength(1);
		expect(rows[0].in_date).toBe(settled.arrival);
		expect(rows[0].out_date).toBe(settled.departure);
	});
});

describe('list room moves on the check-in folio and confirmation — on paper', () => {
	let page: Page;

	beforeAll(async () => {
		page = await openAppPage();
	});

	afterAll(async () => {
		await closeApp(page);
	});

	it('prints both rooms on the check-in folio', async () => {
		await page.goto(`${APP_URL}/reports/check-in-folio/${moved.resnumber}`, {
			waitUntil: 'networkidle'
		});
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain(firstRoom);
		expect(sheet).toContain(secondRoom);
	});

	it('prints both rooms on the confirmation', async () => {
		await page.goto(`${APP_URL}/reports/confirmation/${moved.resnumber}`, {
			waitUntil: 'networkidle'
		});
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain(firstRoom);
		expect(sheet).toContain(secondRoom);
	});

	it('prints one room for a stay that never moves', async () => {
		await page.goto(`${APP_URL}/reports/check-in-folio/${settled.resnumber}`, {
			waitUntil: 'networkidle'
		});
		const rows = await page.locator('.report-page table').first().locator('tbody tr').count();
		expect(rows).toBe(1);
	});
});
