// Story: spec/features/record-room-moves.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import {
	addDays,
	firstOccupancyId,
	makeReservation,
	roomDirectory,
	roomWindows,
	rpc,
	staffClient,
	unwrap,
	type Fixture,
	type RoomRow
} from '../helpers/db';

let rooms: RoomRow[];

beforeAll(async () => {
	rooms = await roomDirectory();
});

describe('record room moves', () => {
	it('closes the room being left on the move date and opens the new one to the end of the stay, both kept, the party carried over', async () => {
		const fx = await makeReservation({ roomid: rooms[0].roomid, numadults: 3 });
		const moveDate = addDays(fx.arrival, 1);
		await rpc('record_room_move', {
			p_occupancyid: await firstOccupancyId(fx),
			p_new_roomid: rooms[1].roomid,
			p_move_date: moveDate
		});
		expect(
			(await roomWindows(fx)).map((w) => [w.roomid, w.occupancyin, w.occupancyout, w.occupancynumguests])
		).toEqual([
			[rooms[0].roomid, fx.arrival, moveDate, 3],
			[rooms[1].roomid, moveDate, fx.departure, 3]
		]);
	});
});

describe('record room moves — on the check-out date', () => {
	async function windows(fx: Fixture) {
		const client = await staffClient();
		return unwrap(
			await client
				.from('v_occupancy_summary')
				.select('occupancyid, roomid, occupancyin, occupancyout')
				.eq('reservationid', fx.reservationid)
				.order('occupancyin')
				.order('occupancyid')
		) as { occupancyid: number; roomid: number; occupancyin: string; occupancyout: string }[];
	}
	async function departure(fx: Fixture): Promise<string> {
		const client = await staffClient();
		const row = unwrap(
			await client
				.from('reservations')
				.select('resdeparturedate')
				.eq('reservationid', fx.reservationid)
				.single()
		) as { resdeparturedate: string };
		return row.resdeparturedate.slice(0, 10);
	}

	it('extends the stay one night in the new room; other rooms still end on the old date', async () => {
		const fx = await makeReservation({ nights: 2, roomid: rooms[0].roomid });
		const [held] = await windows(fx);
		await rpc('assign_room', {
			p_reservationguestid: fx.reservationguestid,
			p_roomid: rooms[1].roomid,
			p_occupancyin: fx.arrival,
			p_occupancyout: fx.departure,
			p_numguests: 2
		});
		const moved = await rpc<number>('record_room_move', {
			p_occupancyid: held.occupancyid,
			p_new_roomid: rooms[2].roomid,
			p_move_date: fx.departure
		});

		const after = await windows(fx);
		const out = (id: number) => after.find((o) => o.occupancyid === id)!.occupancyout.slice(0, 10);
		expect(await departure(fx)).toBe(addDays(fx.departure, 1));
		expect(out(held.occupancyid)).toBe(fx.departure);
		expect(out(after.find((o) => o.roomid === rooms[1].roomid)!.occupancyid)).toBe(fx.departure);
		expect(after.find((o) => o.occupancyid === moved)!.occupancyin.slice(0, 10)).toBe(fx.departure);
		expect(out(moved)).toBe(addDays(fx.departure, 1));
	});

	it('runs the stay to the departure given', async () => {
		const fx = await makeReservation({ nights: 2, roomid: rooms[0].roomid });
		const [held] = await windows(fx);
		const moved = await rpc<number>('record_room_move', {
			p_occupancyid: held.occupancyid,
			p_new_roomid: rooms[1].roomid,
			p_move_date: fx.departure,
			p_out: addDays(fx.departure, 4)
		});
		expect(await departure(fx)).toBe(addDays(fx.departure, 4));
		const after = await windows(fx);
		expect(after.find((o) => o.occupancyid === moved)!.occupancyout.slice(0, 10)).toBe(
			addDays(fx.departure, 4)
		);
	});

	it('refuses a departure on or before the move date', async () => {
		const fx = await makeReservation({ nights: 2, roomid: rooms[0].roomid });
		const [held] = await windows(fx);
		await expect(
			rpc('record_room_move', {
				p_occupancyid: held.occupancyid,
				p_new_roomid: rooms[1].roomid,
				p_move_date: fx.departure,
				p_out: fx.departure
			})
		).rejects.toThrow(/must be after the move date/i);
	});

	it('allows the check-out date only for the room the stay ends in', async () => {
		const fx = await makeReservation({ nights: 3, roomid: rooms[0].roomid });
		const [held] = await windows(fx);
		const moveDate = addDays(fx.arrival, 1);
		await rpc('record_room_move', {
			p_occupancyid: held.occupancyid,
			p_new_roomid: rooms[1].roomid,
			p_move_date: moveDate
		});
		await expect(
			rpc('record_room_move', {
				p_occupancyid: held.occupancyid,
				p_new_roomid: rooms[2].roomid,
				p_move_date: moveDate
			})
		).rejects.toThrow(/must fall inside/i);
	});
});

describe('record room moves — every room holds a night', () => {
	it('refuses a room with no nights', async () => {
		const fx = await makeReservation({ nights: 2, roomid: rooms[0].roomid });
		await expect(
			rpc('assign_room', {
				p_reservationguestid: fx.reservationguestid,
				p_roomid: rooms[1].roomid,
				p_occupancyin: fx.arrival,
				p_occupancyout: fx.arrival,
				p_numguests: 2
			})
		).rejects.toThrow(/at least one night/i);
		const client = await staffClient();
		const [held] = unwrap(
			await client
				.from('v_occupancy_summary')
				.select('occupancyid')
				.eq('reservationid', fx.reservationid)
		) as { occupancyid: number }[];
		await expect(
			rpc('update_room_assignment', { p_occupancyid: held.occupancyid, p_occupancyout: fx.arrival })
		).rejects.toThrow(/at least one night/i);
	});
});

describe('record room moves — the move date', () => {
	const page = useAppPage();
	let stay: Fixture; // three nights in one room, no move yet

	beforeAll(async () => {
		stay = await makeReservation({ nights: 3, roomid: rooms[0].roomid });
		await page.goto(`${APP_URL}/reservations/${stay.resnumber}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Room move' }).click();
		await page.locator('#m-date').waitFor({ timeout: 15_000 });
	});

	it('offers the nights inside the room being left and the check-out date, starting on the first', async () => {
		const box = page.locator('#m-date');
		expect(await box.getAttribute('min')).toBe(addDays(stay.arrival, 1));
		expect(await box.getAttribute('max')).toBe(stay.departure);
		expect(await box.inputValue()).toBe(addDays(stay.arrival, 1));
	});

	it('will not record a move on a date outside them', async () => {
		const record = page.getByRole('button', { name: 'Record move' });
		await expect.poll(() => record.isDisabled()).toBe(false);
		await page.fill('#m-date', stay.arrival);
		await expect.poll(() => record.isDisabled()).toBe(true);
		await page.fill('#m-date', addDays(stay.departure, 1));
		await expect.poll(() => record.isDisabled()).toBe(true);
	});

	it('asks for a departure only for a move on the check-out date, one night on', async () => {
		await page.fill('#m-date', addDays(stay.arrival, 1));
		await expect.poll(() => page.locator('#m-dep').count()).toBe(0);
		await page.fill('#m-date', stay.departure);
		const dep = page.locator('#m-dep');
		await expect.poll(() => dep.inputValue()).toBe(addDays(stay.departure, 1));
		expect(await dep.getAttribute('min')).toBe(addDays(stay.departure, 1));
		await page.fill('#m-dep', stay.departure);
		await expect.poll(() => page.getByRole('button', { name: 'Record move' }).isDisabled()).toBe(true);
	});

	it('records the move and runs the stay on to that departure', async () => {
		const out = addDays(stay.departure, 3);
		await page.fill('#m-dep', out);
		await page.click('#m-room');
		const name = rooms[1].room_compact;
		await page
			.locator('[data-testid=combobox-list] [role=option]', { hasText: name })
			.first()
			.click();
		await page.getByRole('button', { name: 'Record move' }).click();
		await page.getByText('Room move recorded').waitFor({ timeout: 10_000 });

		const client = await staffClient();
		const res = unwrap(
			await client
				.from('reservations')
				.select('resdeparturedate')
				.eq('reservationid', stay.reservationid)
				.single()
		) as { resdeparturedate: string };
		expect(res.resdeparturedate.slice(0, 10)).toBe(out);
		const occ = unwrap(
			await client
				.from('v_occupancy_summary')
				.select('roomid, occupancyin, occupancyout')
				.eq('reservationid', stay.reservationid)
				.order('occupancyin')
		) as { roomid: number; occupancyin: string; occupancyout: string }[];
		expect(occ.map((o) => [o.roomid, o.occupancyin.slice(0, 10), o.occupancyout.slice(0, 10)])).toEqual([
			[rooms[0].roomid, stay.arrival, stay.departure],
			[rooms[1].roomid, stay.departure, out]
		]);
	});

	it('keeps both rooms on the reservation for staff to review', async () => {
		const card = page.locator('[data-slot=card]', { hasText: 'Rooms & moves' });
		await expect
			.poll(async () => (await card.textContent()) ?? '', { timeout: 10_000 })
			.toContain(rooms[1].room_compact);
		expect(await card.textContent()).toContain(rooms[0].room_compact);
	});
});
