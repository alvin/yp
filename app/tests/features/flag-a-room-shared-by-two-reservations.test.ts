// Story: spec/features/flag-a-room-shared-by-two-reservations.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, isolatedDate, makeReservation, rpc, type Fixture } from '../helpers/db';

interface Shared {
	occupancyid: number;
	room: string;
	other_reservationid: number;
	other_resnumber: number;
	other_guest: string;
	shared_in: string;
	shared_out: string;
}

interface DateRow {
	resnumber: number;
	shared_room: boolean;
}

function sharedFor(reservationid: number): Promise<Shared[]> {
	return rpc<Shared[]>('shared_room_occupancies', { p_reservationid: reservationid });
}

let room: number;
let start: string;
let a: Fixture; // holds the room for nights 0–3
let b: Fixture; // holds the same room for nights 1–4 — two nights overlap
let turnover: Fixture; // arrives the day a departs — touching, not sharing
let cancelled: Fixture; // overlaps a, but is cancelled

beforeAll(async () => {
	const rooms = await rpc<{ roomid: number }[]>('room_directory');
	room = rooms[0].roomid;
	start = isolatedDate();

	a = await makeReservation({ arrival: start, departure: addDays(start, 3), roomid: room });
	b = await makeReservation({
		arrival: addDays(start, 1),
		departure: addDays(start, 4),
		roomid: room
	});
	turnover = await makeReservation({
		arrival: addDays(start, 3),
		departure: addDays(start, 5),
		roomid: room
	});
	cancelled = await makeReservation({
		arrival: addDays(start, 1),
		departure: addDays(start, 2),
		roomid: room
	});
	await rpc('cancel_reservation', {
		p_reservationid: cancelled.reservationid,
		p_date: start
	});
});

describe('flag a room shared by two reservations', () => {
	it('identifies both reservations as sharing the room', async () => {
		expect((await sharedFor(a.reservationid)).map((s) => s.other_resnumber)).toContain(b.resnumber);
		expect((await sharedFor(b.reservationid)).map((s) => s.other_resnumber)).toContain(a.resnumber);
	});

	it('names the other party and the nights they share', async () => {
		const hit = (await sharedFor(a.reservationid)).find((s) => s.other_resnumber === b.resnumber)!;
		expect(hit.other_guest).toContain(b.lastname);
		expect(hit.room).toBeTruthy();
		expect(hit.shared_in).toBe(addDays(start, 1));
		expect(hit.shared_out).toBe(addDays(start, 3));
	});

	it('does not mark a turnover, where one party leaves the day the next arrives', async () => {
		const forA = (await sharedFor(a.reservationid)).map((s) => s.other_resnumber);
		expect(forA).not.toContain(turnover.resnumber);
		const forTurnover = (await sharedFor(turnover.reservationid)).map((s) => s.other_resnumber);
		expect(forTurnover).not.toContain(a.resnumber);
	});

	it('does not let a cancelled reservation make a room look shared', async () => {
		const forA = (await sharedFor(a.reservationid)).map((s) => s.other_resnumber);
		expect(forA).not.toContain(cancelled.resnumber);
		expect(await sharedFor(cancelled.reservationid)).toEqual([]);
	});

	it('marks the sharing on the date search results', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: addDays(start, 1),
			p_mode: 'in_house'
		});
		expect(rows.find((r) => r.resnumber === a.resnumber)!.shared_room).toBe(true);
		expect(rows.find((r) => r.resnumber === b.resnumber)!.shared_room).toBe(true);
	});
});

describe('flag a room shared by two reservations — on screen', () => {
	let page: Page;

	beforeAll(async () => {
		page = await openAppPage();
	});

	afterAll(async () => {
		await closeApp(page);
	});

	it('marks the shared room in the date search results', async () => {
		await page.goto(`${APP_URL}/date?date=${addDays(start, 1)}&mode=in_house`, {
			waitUntil: 'networkidle'
		});
		const row = page.locator('tr', { hasText: `#${a.resnumber}` }).first();
		await row.waitFor({ timeout: 15_000 });
		expect(await row.textContent()).toContain('Shared');
	});

	it('marks the shared room on the reservation screen, naming the other party', async () => {
		await page.goto(`${APP_URL}/reservations/${a.resnumber}`, { waitUntil: 'networkidle' });
		const note = page.locator('[data-testid=shared-room]').first();
		await note.waitFor({ timeout: 15_000 });
		expect(await note.textContent()).toContain(`#${b.resnumber}`);
		expect(await page.textContent('body')).toContain('Shared');
	});
});
