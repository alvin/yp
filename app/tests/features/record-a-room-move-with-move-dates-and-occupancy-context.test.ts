// Story: spec/features/record-a-room-move-with-move-dates-and-occupancy-context.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

let fx: Fixture;
let moveDate: string;
let oldOccId: number;
let newOccId: number;

beforeAll(async () => {
	fx = await makeReservation();
	moveDate = addDays(fx.arrival, 1);
	const client = await staffClient();
	const occ = unwrap(
		await client
			.from('v_occupancy_summary')
			.select('occupancyid, roomid, occupancynumguests')
			.eq('reservationid', fx.reservationid)
	) as { occupancyid: number; roomid: number }[];
	oldOccId = occ[0].occupancyid;
	const rooms = await rpc<{ roomid: number }[]>('room_directory');
	const other = rooms.find((r) => r.roomid !== occ[0].roomid)!;
	newOccId = await rpc<number>('record_room_move', {
		p_occupancyid: oldOccId,
		p_new_roomid: other.roomid,
		p_move_date: moveDate
	});
});

describe('record a room move with move dates and occupancy context', () => {
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
		expect(newRow.occupancyout.slice(0, 10)).toBe(fx.departure);
	});

	it('keeps both rooms visible in the stay history', async () => {
		const client = await staffClient();
		const occ = unwrap(
			await client
				.from('v_occupancy_summary')
				.select('room')
				.eq('reservationid', fx.reservationid)
		) as { room: string }[];
		expect(occ).toHaveLength(2);
	});

	it('retains the occupancy context (guest count) with the move', async () => {
		const client = await staffClient();
		const occ = unwrap(
			await client
				.from('room_assignments')
				.select('occupancynumguests')
				.in('occupancyid', [oldOccId, newOccId])
		) as { occupancynumguests: number }[];
		expect(occ[0].occupancynumguests).toBe(occ[1].occupancynumguests);
	});
});

describe('record a room move with move dates and occupancy context — the move date', () => {
	let page: Page;
	let stay: Fixture; // three nights in one room, no move yet

	beforeAll(async () => {
		stay = await makeReservation({ nights: 3 });
		page = await openAppPage();
		await page.goto(`${APP_URL}/reservations/${stay.resnumber}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Room move' }).click();
		await page.locator('#m-date').waitFor({ timeout: 15_000 });
	});

	afterAll(async () => {
		await closeApp(page);
	});

	it('offers only the nights inside the room being left, starting on the first', async () => {
		const box = page.locator('#m-date');
		expect(await box.getAttribute('min')).toBe(addDays(stay.arrival, 1));
		expect(await box.getAttribute('max')).toBe(addDays(stay.departure, -1));
		expect(await box.inputValue()).toBe(addDays(stay.arrival, 1));
	});

	it('will not record a move on a date outside them', async () => {
		const record = page.getByRole('button', { name: 'Record move' });
		expect(await record.isDisabled()).toBe(false);
		await page.fill('#m-date', stay.arrival);
		expect(await record.isDisabled()).toBe(true);
		await page.fill('#m-date', stay.departure);
		expect(await record.isDisabled()).toBe(true);
	});
});
