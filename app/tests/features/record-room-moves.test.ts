// Story: spec/features/record-room-moves.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

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

function fxMid(): string {
	const [y, m, d] = fx.arrival.split('-').map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d + 1));
	return dt.toISOString().slice(0, 10);
}
