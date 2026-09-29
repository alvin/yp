// Story: spec/features/show-room-availability-during-booking.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc } from '../helpers/db';

interface RoomRow {
	roomid: number;
	roomorder: number | null;
	roomshorthand: string | null;
	room: string;
	is_available: boolean;
}

describe('show room availability during booking', () => {
	it('lists rooms in the lodge’s own room order', async () => {
		const rooms = await rpc<RoomRow[]>('room_directory');
		const orders = rooms.map((r) => r.roomorder ?? Number.MAX_SAFE_INTEGER);
		expect(orders).toEqual([...orders].sort((a, b) => a - b));
	});

	it('carries the brief bed-layout description per room', async () => {
		const rooms = await rpc<RoomRow[]>('room_directory');
		expect(rooms.some((r) => r.roomshorthand && r.roomshorthand.trim().length > 0)).toBe(true);
	});

	it('flags rooms occupied for the stay window as unavailable', async () => {
		const fx = await makeReservation();
		const rooms = await rpc<RoomRow[]>('room_directory', { p_in: fx.arrival, p_out: fx.departure });
		const booked = rooms.find((r) => !r.is_available);
		expect(booked).toBeDefined();
		// A different window on the same isolated date-block is free.
		const free = await rpc<RoomRow[]>('room_directory', {
			p_in: addDays(fx.departure, 10),
			p_out: addDays(fx.departure, 12)
		});
		expect(free.every((r) => r.is_available)).toBe(true);
	});

	it('does not let cancelled reservations block availability', async () => {
		const fx = await makeReservation();
		await rpc('cancel_reservation', {
			p_reservationid: fx.reservationid,
			p_date: fx.arrival,
			p_deposit_handling: 'none'
		});
		const rooms = await rpc<RoomRow[]>('room_directory', { p_in: fx.arrival, p_out: fx.departure });
		expect(rooms.every((r) => r.is_available)).toBe(true);
	});
});

describe('show room availability during booking — on the booking screen', () => {
	let page: Page;

	beforeAll(async () => {
		page = await openAppPage();
	});

	afterAll(async () => {
		await closeApp(page);
	});

	/** The room list's entries as shown, once it has settled. */
	async function roomList(): Promise<string[]> {
		await page.click('#room');
		const list = page.locator('[data-testid=combobox-list] [role=option]');
		await list.first().waitFor({ timeout: 10_000 });
		const shown = await list.allTextContents();
		await page.keyboard.press('Escape');
		return shown;
	}

	it('marks the room another stay holds for those nights as Booked, and only that one', async () => {
		const other = await makeReservation(); // holds the first room for its nights
		const [first] = await rpc<{ room: string; roomname: string; roomnumber: string | null }[]>(
			'room_directory'
		);
		const name = `${first.roomname} ${first.roomnumber ?? ''}`.trim();

		await page.goto(`${APP_URL}/reservations/new`, { waitUntil: 'networkidle' });
		await page.fill('#arr', other.arrival);
		await page.fill('#dep', other.departure);
		await expect
			.poll(async () => (await roomList()).filter((o) => o.includes('Booked')), { timeout: 10_000 })
			.toEqual([expect.stringContaining(name)]);

		// Nights the other stay does not hold: nothing is marked.
		await page.fill('#arr', addDays(other.departure, 10));
		await page.fill('#dep', addDays(other.departure, 12));
		await expect
			.poll(async () => (await roomList()).some((o) => o.includes('Booked')), { timeout: 10_000 })
			.toBe(false);
	});
});
