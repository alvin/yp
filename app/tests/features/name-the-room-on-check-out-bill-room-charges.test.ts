// Story: spec/features/name-the-room-on-check-out-bill-room-charges.feature

import { beforeAll, describe, expect, it } from 'vitest';
import {
	addDays,
	makeReservation,
	postCharge,
	postRoomNights,
	pricedItem,
	roomDirectory,
	rpc,
	type Fixture,
	type Item,
	type RoomRow
} from '../helpers/db';

interface BillLine {
	sort_group: 'charges' | 'settlements';
	description: string;
	amount: number;
}

function billLines(reservationid: number): Promise<BillLine[]> {
	return rpc<BillLine[]>('report_checkout_bill_lines', { p_reservationid: reservationid });
}

let fx: Fixture;
let numbered: RoomRow; // a room known by building and number — "Lodge 05"
let named: RoomRow; // a room known by its own name — "Ruxton"
let item: Item;

beforeAll(async () => {
	const rooms = await roomDirectory();
	numbered = rooms.find((r) => r.roomnumber && r.roomnumber.trim())!;
	named = rooms.find((r) => !r.roomnumber || !r.roomnumber.trim())!;

	fx = await makeReservation({ nights: 4, roomid: numbered.roomid });
	// A stay that moves: a night in each room, charged separately.
	await postRoomNights(fx, 150, { roomid: numbered.roomid, to: addDays(fx.arrival, 2) });
	await postRoomNights(fx, 160, {
		roomid: named.roomid,
		from: addDays(fx.arrival, 2),
		transdate: addDays(fx.arrival, 2)
	});

	// Something that is not a room, to prove its description is untouched.
	item = await pricedItem();
	await postCharge(fx, { inventoryid: item.inventoryid });
});

describe('name the room on check-out bill room charges', () => {
	it('names the room a room-night charge was posted for', async () => {
		const charges = (await billLines(fx.reservationid)).filter((l) => l.sort_group === 'charges');
		expect(charges.some((l) => l.description.startsWith('Room – '))).toBe(true);
	});

	it('shows the room number where the room carries one', async () => {
		const charges = (await billLines(fx.reservationid)).filter((l) => l.sort_group === 'charges');
		const expected = `Room – ${numbered.roomname} #${numbered.roomnumber!.trim()}`;
		expect(charges.map((l) => l.description)).toContain(expected);
	});

	it('shows the name alone for a room known only by name', async () => {
		const charges = (await billLines(fx.reservationid)).filter((l) => l.sort_group === 'charges');
		expect(charges.map((l) => l.description)).toContain(`Room – ${named.roomname}`);
	});

	it('gives a stay that moved a separately named charge for each room', async () => {
		const charges = (await billLines(fx.reservationid)).filter((l) => l.sort_group === 'charges');
		const roomLines = charges.filter((l) => l.description.startsWith('Room – '));
		expect(roomLines).toHaveLength(2);
		expect(new Set(roomLines.map((l) => l.description)).size).toBe(2);
	});

	it('leaves charges that are not for a room described as they were', async () => {
		const charges = (await billLines(fx.reservationid)).filter((l) => l.sort_group === 'charges');
		const extras = charges.filter((l) => !l.description.startsWith('Room – '));
		expect(extras.map((l) => l.description)).toEqual([item.invitemdescription]);
	});
});
