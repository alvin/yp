// Story: spec/features/preserve-room-order-sequencing.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, isolatedDate, makeReservation, rpc } from '../helpers/db';

let date: string;
let mid: string;

beforeAll(async () => {
	date = isolatedDate();
	mid = addDays(date, 1);
	const rooms = await rpc<{ roomid: number; roomorder: number | null }[]>('room_directory');
	const ordered = rooms.filter((r) => r.roomorder != null);
	// Book the later-ordered room first to prove the report re-orders.
	await makeReservation({ arrival: date, nights: 3, roomid: ordered[5].roomid });
	await makeReservation({ arrival: date, nights: 3, roomid: ordered[0].roomid });
});

describe('preserve room order sequencing', () => {
	it('orders the manual sales list by the lodge room order', async () => {
		const rows = await rpc<{ room_order: number }[]>('report_manual_sales', { p_date: mid });
		const orders = rows.map((r) => Number(r.room_order));
		expect(orders).toEqual([...orders].sort((a, b) => a - b));
		expect(rows.length).toBe(2);
	});

	it('orders the housekeeping report the same way', async () => {
		const rows = await rpc<{ room: string }[]>('report_housekeeping', { p_date: mid });
		expect(rows.length).toBe(2);
		// Same order as manual sales (both follow roomorder).
		const manual = await rpc<{ room: string }[]>('report_manual_sales', { p_date: mid });
		expect(rows.map((r) => r.room.replace(':', ''))).toEqual(
			manual.map((r) => r.room)
		);
	});
});
