// Story: spec/features/record-room-moves.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

let fx: Fixture;
let rooms: { roomid: number }[];

beforeAll(async () => {
	fx = await makeReservation();
	rooms = await rpc<{ roomid: number }[]>('room_directory');
});

describe('record room moves', () => {
	it('adds a room move for the current stay', async () => {
		const client = await staffClient();
		const occ = unwrap(
			await client
				.from('v_occupancy_summary')
				.select('occupancyid, roomid')
				.eq('reservationid', fx.reservationid)
		) as { occupancyid: number; roomid: number }[];
		const other = rooms.find((r) => r.roomid !== occ[0].roomid)!;
		const newId = await rpc<number>('record_room_move', {
			p_occupancyid: occ[0].occupancyid,
			p_new_roomid: other.roomid,
			p_move_date: fxMid(),
			p_notes: 'QA move'
		});
		expect(newId).toBeGreaterThan(0);
	});

	it('shows both the room being left and the room being entered', async () => {
		const client = await staffClient();
		const occ = unwrap(
			await client
				.from('v_occupancy_summary')
				.select('roomid')
				.eq('reservationid', fx.reservationid)
		) as { roomid: number }[];
		expect(new Set(occ.map((o) => o.roomid)).size).toBe(2);
	});

	it('keeps the move as part of the stay occupancy history', async () => {
		const client = await staffClient();
		const occ = unwrap(
			await client
				.from('v_occupancy_summary')
				.select('occupancyin, occupancyout')
				.eq('reservationid', fx.reservationid)
				.order('occupancyin')
		) as { occupancyin: string; occupancyout: string }[];
		expect(occ).toHaveLength(2);
		expect(occ[0].occupancyout.slice(0, 10)).toBe(occ[1].occupancyin.slice(0, 10));
	});
});

describe('record room moves — move dates and party size', () => {
	let moveFx: Fixture;
	let moveDate: string;
	let oldOccId: number;
	let newOccId: number;

	beforeAll(async () => {
		moveFx = await makeReservation();
		moveDate = addDays(moveFx.arrival, 1);
		const client = await staffClient();
		const occ = unwrap(
			await client
				.from('v_occupancy_summary')
				.select('occupancyid, roomid, occupancynumguests')
				.eq('reservationid', moveFx.reservationid)
		) as { occupancyid: number; roomid: number }[];
		oldOccId = occ[0].occupancyid;
		const allRooms = await rpc<{ roomid: number }[]>('room_directory');
		const other = allRooms.find((r) => r.roomid !== occ[0].roomid)!;
		newOccId = await rpc<number>('record_room_move', {
			p_occupancyid: oldOccId,
			p_new_roomid: other.roomid,
			p_move_date: moveDate
		});
	});

	it('records the move date on both sides of the move', async () => {
		const client = await staffClient();
		const occ = unwrap(
			await client
				.from('room_assignments')
				.select('occupancyid, occupancyin, occupancyout')
				.in('occupancyid', [oldOccId, newOccId])
		) as { occupancyid: number; occupancyin: string; occupancyout: string }[];
		const oldRow = occ.find((o) => o.occupancyid === oldOccId)!;
		const newRow = occ.find((o) => o.occupancyid === newOccId)!;
		expect(oldRow.occupancyout.slice(0, 10)).toBe(moveDate);
		expect(newRow.occupancyin.slice(0, 10)).toBe(moveDate);
		expect(newRow.occupancyout.slice(0, 10)).toBe(moveFx.departure);
	});

	it('retains the occupancy context (guest count) with the move', async () => {
		const client = await staffClient();
		const occ = unwrap(
			await client
				.from('room_assignments')
				.select('occupancynumguests')
				.in('occupancyid', [oldOccId, newOccId])
		) as { occupancynumguests: number }[];
		expect(occ.map((o) => o.occupancynumguests)).toEqual([2, 2]);
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

describe('record room moves — the move date', () => {
	let page: Page;
	let stay: Fixture; // three nights in one room, no move yet
	let directory: { roomid: number; roomname: string; roomnumber: string | null }[];

	beforeAll(async () => {
		directory = await rpc('room_directory');
		stay = await makeReservation({ nights: 3, roomid: directory[0].roomid });
		page = await openAppPage();
		await page.goto(`${APP_URL}/reservations/${stay.resnumber}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Room move' }).click();
		await page.locator('#m-date').waitFor({ timeout: 15_000 });
	});

	afterAll(async () => {
		await closeApp(page);
	});

	it('offers the nights inside the room being left and the check-out date, starting on the first', async () => {
		const box = page.locator('#m-date');
		expect(await box.getAttribute('min')).toBe(addDays(stay.arrival, 1));
		expect(await box.getAttribute('max')).toBe(stay.departure);
		expect(await box.inputValue()).toBe(addDays(stay.arrival, 1));
	});

	it('will not record a move on a date outside them', async () => {
		const record = page.getByRole('button', { name: 'Record move' });
		expect(await record.isDisabled()).toBe(false);
		await page.fill('#m-date', stay.arrival);
		expect(await record.isDisabled()).toBe(true);
		await page.fill('#m-date', addDays(stay.departure, 1));
		expect(await record.isDisabled()).toBe(true);
	});

	it('asks for a departure only for a move on the check-out date, one night on', async () => {
		await page.fill('#m-date', addDays(stay.arrival, 1));
		expect(await page.locator('#m-dep').count()).toBe(0);
		await page.fill('#m-date', stay.departure);
		const dep = page.locator('#m-dep');
		expect(await dep.inputValue()).toBe(addDays(stay.departure, 1));
		expect(await dep.getAttribute('min')).toBe(addDays(stay.departure, 1));
		await page.fill('#m-dep', stay.departure);
		expect(await page.getByRole('button', { name: 'Record move' }).isDisabled()).toBe(true);
	});

	it('records the move and runs the stay on to that departure', async () => {
		const out = addDays(stay.departure, 3);
		await page.fill('#m-dep', out);
		await page.click('#m-room');
		const name = `${directory[1].roomname} ${directory[1].roomnumber ?? ''}`.trim();
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
			[directory[0].roomid, stay.arrival, stay.departure],
			[directory[1].roomid, stay.departure, out]
		]);
	});
});

function fxMid(): string {
	const [y, m, d] = fx.arrival.split('-').map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d + 1));
	return dt.toISOString().slice(0, 10);
}
