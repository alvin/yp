// Story: spec/features/show-room-availability-during-booking.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { addDays, cancel, makeReservation, roomDirectory, rpc, type RoomRow } from '../helpers/db';

interface Availability {
	roomid: number;
	is_available: boolean;
}

const unavailable = async (from: string, to: string) =>
	(await rpc<Availability[]>('room_directory', { p_in: from, p_out: to }))
		.filter((r) => !r.is_available)
		.map((r) => r.roomid);

let rooms: RoomRow[];

const page = useAppPage('/reservations/new');

/** The room list's entries as shown. */
async function roomList(): Promise<string[]> {
	await page.click('#room');
	const list = page.locator('[data-testid=combobox-list] [role=option]');
	await list.first().waitFor({ timeout: 10_000 });
	const shown = (await list.allTextContents()).map((t) => t.trim());
	await page.keyboard.press('Escape');
	return shown;
}

// The admin tests add rooms named ZZ…, briefly, while this one may be reading
// the list; leave them out on both sides.
const fixture = (name: string) => name.startsWith('ZZ');

beforeAll(async () => {
	rooms = (await roomDirectory()).filter((r) => !fixture(r.roomname));
});

describe('show room availability during booking', () => {
	it('lists the rooms in the lodge’s own order, each with its bed layout', async () => {
		const orders = rooms.map((r) => r.roomorder ?? Number.MAX_SAFE_INTEGER);
		expect(orders).toEqual([...orders].sort((a, b) => a - b));
		const shown = (await roomList()).filter((entry) => !fixture(entry));
		expect(shown).toHaveLength(rooms.length);
		shown.forEach((entry, i) => {
			expect(entry.startsWith(rooms[i].room_compact), entry).toBe(true);
			if (rooms[i].roomshorthand) expect(entry, entry).toContain(`— ${rooms[i].roomshorthand}`);
		});
		expect(rooms.filter((r) => r.roomshorthand).length).toBeGreaterThan(rooms.length / 2);
	});

	it('counts a room held for any night of the stay as booked, and only that room', async () => {
		const fx = await makeReservation({ roomid: rooms[0].roomid });
		expect(await unavailable(fx.arrival, fx.departure)).toEqual([rooms[0].roomid]);
		expect(await unavailable(addDays(fx.departure, -1), addDays(fx.departure, 2))).toEqual([rooms[0].roomid]);
		expect(await unavailable(fx.departure, addDays(fx.departure, 2))).toEqual([]);
	});

	it('does not let a cancelled reservation hold a room', async () => {
		const fx = await makeReservation({ roomid: rooms[0].roomid });
		await cancel(fx);
		expect(await unavailable(fx.arrival, fx.departure)).toEqual([]);
	});

	it('marks the room another stay holds for those nights as Booked on screen, and only that one', async () => {
		const other = await makeReservation({ roomid: rooms[0].roomid });
		await page.fill('#arr', other.arrival);
		await page.fill('#dep', other.departure);
		await expect
			.poll(async () => (await roomList()).filter((o) => o.includes('Booked')), { timeout: 10_000 })
			.toEqual([expect.stringContaining(rooms[0].room_compact)]);

		// Nights just before it, which no stay holds: nothing is marked.
		await page.fill('#arr', addDays(other.arrival, -4));
		await page.fill('#dep', addDays(other.arrival, -2));
		await expect
			.poll(async () => (await roomList()).some((o) => o.includes('Booked')), { timeout: 10_000 })
			.toBe(false);
	});
});
