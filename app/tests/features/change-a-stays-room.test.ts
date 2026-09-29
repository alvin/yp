// Story: spec/features/change-a-stays-room.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

interface RoomRow {
	roomid: number;
	roomname: string;
	roomnumber: string | null;
}

let rooms: RoomRow[];

async function windows(fx: Fixture): Promise<{ occupancyid: number; roomid: number }[]> {
	const db = await staffClient();
	return unwrap(
		await db
			.from('room_assignments')
			.select('occupancyid, roomid')
			.eq('reservationguestid', fx.reservationguestid)
			.eq('occupancyarchive', false)
			.order('occupancyin')
	) as { occupancyid: number; roomid: number }[];
}

beforeAll(async () => {
	rooms = (await rpc<RoomRow[]>('room_directory')).slice(0, 4);
});

describe("change a stay's room", () => {
	it('changes the room for the same nights', async () => {
		const fx = await makeReservation({ roomid: rooms[0].roomid });
		const [w] = await windows(fx);
		await rpc('update_room_assignment', { p_occupancyid: w.occupancyid, p_roomid: rooms[1].roomid });
		expect(await windows(fx)).toEqual([{ occupancyid: w.occupancyid, roomid: rooms[1].roomid }]);
	});

	it('refuses while a room charge for the old room is posted, and allows it once removed', async () => {
		const fx = await makeReservation({ roomid: rooms[0].roomid });
		const [w] = await windows(fx);
		const charge = await rpc<number>('post_room_nights', {
			p_reservationguestid: fx.reservationguestid,
			p_roomid: rooms[0].roomid,
			p_occupancyin: fx.arrival,
			p_occupancyout: fx.departure,
			p_rate: 100,
			p_transdate: fx.departure
		});
		await expect(
			rpc('update_room_assignment', { p_occupancyid: w.occupancyid, p_roomid: rooms[1].roomid })
		).rejects.toThrow(/room charge .* is posted/i);
		await rpc('archive_transaction', { p_transactionid: charge });
		await rpc('update_room_assignment', { p_occupancyid: w.occupancyid, p_roomid: rooms[1].roomid });
		expect((await windows(fx))[0].roomid).toBe(rooms[1].roomid);
	});

	it('refuses the room the stay moves from next door', async () => {
		const fx = await makeReservation({ roomid: rooms[0].roomid, nights: 4 });
		const [w] = await windows(fx);
		const moved = await rpc<number>('record_room_move', {
			p_occupancyid: w.occupancyid,
			p_new_roomid: rooms[1].roomid,
			p_move_date: addDays(fx.arrival, 2)
		});
		await expect(
			rpc('update_room_assignment', { p_occupancyid: moved, p_roomid: rooms[0].roomid })
		).rejects.toThrow(/undo the move/i);
	});
});

describe("change a stay's room — on screen", () => {
	let page: Page;

	beforeAll(async () => {
		page = await openAppPage();
	});

	afterAll(async () => {
		await closeApp(page);
	});

	it('changes the room from the pencil beside it, marking rooms held those nights', async () => {
		const other = await makeReservation({ roomid: rooms[2].roomid });
		const fx = await makeReservation({ roomid: rooms[0].roomid, arrival: other.arrival, departure: other.departure });
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		await page.locator('button[title="Change room"]').first().click();
		await page.click('#cr-room');
		const list = page.locator('[data-testid=combobox-list] [role=option]');
		await list.first().waitFor({ timeout: 10_000 });
		const name = (r: RoomRow) => `${r.roomname} ${r.roomnumber ?? ''}`.trim();
		await expect
			.poll(async () => (await list.allTextContents()).filter((o) => o.includes('Booked')), {
				timeout: 10_000
			})
			.toEqual([expect.stringContaining(name(rooms[2]))]);
		expect((await list.allTextContents()).some((o) => o.includes(name(rooms[0])))).toBe(false);

		await list.filter({ hasText: name(rooms[1]) }).first().click();
		await page.getByRole('dialog').getByRole('button', { name: 'Change room' }).click();
		await expect.poll(async () => (await windows(fx))[0].roomid, { timeout: 10_000 }).toBe(rooms[1].roomid);
	});
});
