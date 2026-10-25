// Story: spec/features/list-room-moves-on-the-check-in-folio-and-confirmation.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, printedDate, useAppPage } from '../helpers/app';
import { addDays, firstOccupancyId, makeReservation, roomDirectory, rpc, type Fixture } from '../helpers/db';

let moved: Fixture; // a party of three, moving rooms mid-stay
let settled: Fixture; // one room the whole way
let moveDate: string;
let rooms: string[];

const page = useAppPage();

/** The rooms table of a printed guest document, as [room, in, out, guests] rows. */
async function printedRooms(document: string, fx: Fixture): Promise<string[][]> {
	await page.goto(`${APP_URL}/reports/${document}/${fx.resnumber}`, { waitUntil: 'networkidle' });
	return page
		.locator('.report-page table')
		.first()
		.locator('tbody tr')
		.evaluateAll((rows) =>
			rows.map((r) =>
				Array.from(r.children).map((c) =>
					(c as HTMLElement).innerText.replace(/^(Room:|In:|Out:|# Guests)\s*/, '').trim()
				)
			)
		);
}

beforeAll(async () => {
	const directory = await roomDirectory();
	rooms = directory.map((r) => r.room);
	moved = await makeReservation({ nights: 4, numadults: 3, roomid: directory[0].roomid });
	moveDate = addDays(moved.arrival, 2);
	await rpc('record_room_move', {
		p_occupancyid: await firstOccupancyId(moved),
		p_new_roomid: directory[1].roomid,
		p_move_date: moveDate
	});
	settled = await makeReservation({ nights: 3, roomid: directory[2].roomid });
});

describe('list room moves on the check-in folio and confirmation', () => {
	it('prints every room of the stay on the folio, in order, with its own dates and party size', async () => {
		expect(await printedRooms('check-in-folio', moved)).toEqual([
			[rooms[0], printedDate(moved.arrival), printedDate(moveDate), '3'],
			[rooms[1], printedDate(moveDate), printedDate(moved.departure), '3']
		]);
	});

	it('prints them the same way on the confirmation', async () => {
		expect(await printedRooms('confirmation', moved)).toEqual([
			[rooms[0], printedDate(moved.arrival), printedDate(moveDate), '3'],
			[rooms[1], printedDate(moveDate), printedDate(moved.departure), '3']
		]);
	});

	it('prints exactly one room for a stay that never moves', async () => {
		const row = [rooms[2], printedDate(settled.arrival), printedDate(settled.departure), '2'];
		expect(await printedRooms('check-in-folio', settled)).toEqual([row]);
		expect(await printedRooms('confirmation', settled)).toEqual([row]);
	});
});
