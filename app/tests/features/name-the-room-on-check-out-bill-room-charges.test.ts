// Story: spec/features/name-the-room-on-check-out-bill-room-charges.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

interface BillLine {
	sort_group: 'charges' | 'settlements';
	description: string;
	amount: number;
}

interface RoomRow {
	roomid: number;
	roomname: string;
	roomnumber: string | null;
}

function billLines(reservationid: number): Promise<BillLine[]> {
	return rpc<BillLine[]>('report_checkout_bill_lines', { p_reservationid: reservationid });
}

let fx: Fixture;
let numbered: RoomRow; // a room known by building and number — "Lodge 05"
let named: RoomRow; // a room known by its own name — "Ruxton"
let inventoryid: number;

beforeAll(async () => {
	const rooms = await rpc<RoomRow[]>('room_directory');
	numbered = rooms.find((r) => r.roomnumber && r.roomnumber.trim())!;
	named = rooms.find((r) => !r.roomnumber || !r.roomnumber.trim())!;

	fx = await makeReservation({ nights: 4, roomid: numbered.roomid });
	// A stay that moves: a night in each room, charged separately.
	await rpc('post_room_nights', {
		p_reservationguestid: fx.reservationguestid,
		p_roomid: numbered.roomid,
		p_occupancyin: fx.arrival,
		p_occupancyout: addDays(fx.arrival, 2),
		p_rate: 150,
		p_transdate: fx.arrival
	});
	await rpc('post_room_nights', {
		p_reservationguestid: fx.reservationguestid,
		p_roomid: named.roomid,
		p_occupancyin: addDays(fx.arrival, 2),
		p_occupancyout: fx.departure,
		p_rate: 160,
		p_transdate: addDays(fx.arrival, 2)
	});

	// Something that is not a room, to prove its description is untouched.
	const client = await staffClient();
	inventoryid = (
		unwrap(
			await client
				.from('inventory_items')
				.select('inventoryid')
				.eq('invarchive', false)
				.gt('invamount', 0)
				.limit(1)
		) as { inventoryid: number }[]
	)[0].inventoryid;
	await rpc('post_charge', {
		p_reservationguestid: fx.reservationguestid,
		p_inventoryid: inventoryid,
		p_quantity: 1,
		p_transdate: fx.arrival
	});
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
		expect(extras.length).toBeGreaterThan(0);
		for (const l of extras) expect(l.description).not.toContain(' – ');
	});
});
