// Story: spec/features/undo-a-room-move.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import {
	addDays,
	firstOccupancyId as firstWindow,
	makeReservation,
	postRoomNights,
	roomDirectory,
	roomWindows,
	rpc,
	staffClient,
	unwrap,
	type Fixture
} from '../helpers/db';

let rooms: number[];

/** The stay's live room windows, in stay order (room order within a day), as [room, in, out]. */
async function windows(fx: Fixture): Promise<[number, string, string][]> {
	return (await roomWindows(fx))
		.map((w): [number, string, string] => [w.roomid, w.occupancyin, w.occupancyout])
		.sort((a, b) => a[1].localeCompare(b[1]) || a[0] - b[0]);
}

function move(occupancyid: number, roomid: number, date: string): Promise<number> {
	return rpc<number>('record_room_move', {
		p_occupancyid: occupancyid,
		p_new_roomid: roomid,
		p_move_date: date
	});
}

beforeAll(async () => {
	rooms = (await roomDirectory()).slice(0, 5).map((r) => r.roomid);
});

describe('undo a room move', () => {
	it('keeps the stay in the room it was leaving, through the end of the move', async () => {
		const fx = await makeReservation({ nights: 5, roomid: rooms[0] });
		const moved = await move(await firstWindow(fx), rooms[1], addDays(fx.arrival, 2));
		await rpc('undo_room_move', { p_occupancyid: moved });
		expect(await windows(fx)).toEqual([[rooms[0], fx.arrival, fx.departure]]);
	});

	it('undoes only the move chosen when a stay moves more than once', async () => {
		const fx = await makeReservation({ nights: 6, roomid: rooms[0] });
		const second = await move(await firstWindow(fx), rooms[1], addDays(fx.arrival, 2));
		const third = await move(second, rooms[2], addDays(fx.arrival, 4));
		await rpc('undo_room_move', { p_occupancyid: third });
		expect(await windows(fx)).toEqual([
			[rooms[0], fx.arrival, addDays(fx.arrival, 2)],
			[rooms[1], addDays(fx.arrival, 2), fx.departure]
		]);
	});

	it('leaves a stay that moved out and back in one room', async () => {
		const fx = await makeReservation({ nights: 6, roomid: rooms[0] });
		const away = await move(await firstWindow(fx), rooms[1], addDays(fx.arrival, 2));
		await move(away, rooms[0], addDays(fx.arrival, 4));
		await rpc('undo_room_move', { p_occupancyid: away });
		expect(await windows(fx)).toEqual([[rooms[0], fx.arrival, fx.departure]]);
	});

	it('asks which room the stay goes back to when two rooms moved on the same day', async () => {
		const fx = await makeReservation({ nights: 5, roomid: rooms[0] });
		const first = await firstWindow(fx);
		const second = await rpc<number>('assign_room', {
			p_reservationguestid: fx.reservationguestid,
			p_roomid: rooms[3],
			p_occupancyin: fx.arrival,
			p_occupancyout: fx.departure
		});
		const moveDate = addDays(fx.arrival, 2);
		const moved = await move(first, rooms[1], moveDate);
		await move(second, rooms[4], moveDate);

		await expect(rpc('undo_room_move', { p_occupancyid: moved })).rejects.toThrow(/choose/i);
		await rpc('undo_room_move', { p_occupancyid: moved, p_from_occupancyid: first });
		expect(await windows(fx)).toEqual([
			[rooms[0], fx.arrival, fx.departure],
			[rooms[3], fx.arrival, moveDate],
			[rooms[4], moveDate, fx.departure]
		]);
	});

	it("won't undo a stay's first room or a room added alongside it", async () => {
		const fx = await makeReservation({ nights: 3, roomid: rooms[0] });
		const alongside = await rpc<number>('assign_room', {
			p_reservationguestid: fx.reservationguestid,
			p_roomid: rooms[1],
			p_occupancyin: fx.arrival,
			p_occupancyout: fx.departure
		});
		await expect(
			rpc('undo_room_move', { p_occupancyid: await firstWindow(fx) })
		).rejects.toThrow(/not a move/i);
		await expect(rpc('undo_room_move', { p_occupancyid: alongside })).rejects.toThrow(
			/not a move/i
		);
		expect(await rpc('room_moves', { p_reservationid: fx.reservationid })).toEqual([]);
	});

	it('leaves charges already posted as posted', async () => {
		const fx = await makeReservation({ nights: 4, roomid: rooms[0] });
		const moveDate = addDays(fx.arrival, 2);
		const moved = await move(await firstWindow(fx), rooms[1], moveDate);
		const charge = await postRoomNights(fx, 100, { roomid: rooms[1], from: moveDate, transdate: moveDate });
		await rpc('undo_room_move', { p_occupancyid: moved });
		const db = await staffClient();
		const [line] = unwrap(
			await db
				.from('transactions')
				.select('roomid, transamount, transquantity, transarchive')
				.eq('transactionid', charge)
		) as { roomid: number; transamount: number; transquantity: number; transarchive: boolean }[];
		expect(line).toEqual({ roomid: rooms[1], transamount: 200, transquantity: 2, transarchive: false });
	});
});

describe('undo a room move — on screen', () => {
	const page = useAppPage();

	async function open(fx: Fixture): Promise<void> {
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
	}

	it('undoes a move from its garbage can', async () => {
		const fx = await makeReservation({ nights: 5, roomid: rooms[0] });
		await move(await firstWindow(fx), rooms[1], addDays(fx.arrival, 2));
		await open(fx);

		// Only the move carries a garbage can, not the room the stay started in.
		const cans = page.locator('button[title="Undo this move"]');
		await expect.poll(() => cans.count(), { timeout: 10_000 }).toBe(1);
		await cans.first().click();
		const dialog = page.getByRole('dialog');
		await expect.poll(() => dialog.textContent(), { timeout: 10_000 }).toContain('Undo this move?');
		await dialog.getByRole('button', { name: 'Undo move' }).click();

		await expect.poll(() => cans.count(), { timeout: 10_000 }).toBe(0);
		expect(await windows(fx)).toEqual([[rooms[0], fx.arrival, fx.departure]]);
	});

	it('has the desk pick the room when two moved on the same day', async () => {
		const fx = await makeReservation({ nights: 5, roomid: rooms[0] });
		const first = await firstWindow(fx);
		const second = await rpc<number>('assign_room', {
			p_reservationguestid: fx.reservationguestid,
			p_roomid: rooms[3],
			p_occupancyin: fx.arrival,
			p_occupancyout: fx.departure
		});
		const moveDate = addDays(fx.arrival, 2);
		await move(first, rooms[1], moveDate);
		await move(second, rooms[4], moveDate);
		await open(fx);

		await page.locator('button[title="Undo this move"]').first().click();
		const dialog = page.getByRole('dialog');
		const undo = dialog.getByRole('button', { name: 'Undo move' });
		await dialog.locator('#u-from').waitFor({ timeout: 10_000 });
		await expect.poll(() => undo.isDisabled()).toBe(true);

		await page.click('#u-from');
		await page.locator('[data-testid=combobox-list] [role=option]').first().click();
		await expect.poll(() => undo.isDisabled()).toBe(false);
		await undo.click();
		await expect.poll(async () => (await windows(fx)).length, { timeout: 10_000 }).toBe(3);
	});
});
