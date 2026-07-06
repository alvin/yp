// Story: spec/features/exclude-cancelled-reservations.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { isolatedDate, makeReservation, rpc, type Fixture } from '../helpers/db';

interface ManualSalesRow {
	room: string | null;
	resnumber: number;
	guest_last_name: string;
	is_cancelled: boolean;
}

interface DateRow {
	resnumber: number;
	rescancelled: boolean;
}

let date: string;
let cancelled: Fixture;
let active: Fixture;

beforeAll(async () => {
	date = isolatedDate();
	// Two roomed stays on the same isolated date (different rooms — the
	// manual sales list is built from room occupancy).
	const rooms = await rpc<{ roomid: number }[]>('room_directory');
	cancelled = await makeReservation({ arrival: date, nights: 2, roomid: rooms[0].roomid });
	active = await makeReservation({
		arrival: date,
		nights: 2,
		roomid: rooms[1]?.roomid ?? rooms[0].roomid
	});
	await rpc('cancel_reservation', { p_reservationid: cancelled.reservationid, p_date: date });
});

describe('exclude cancelled reservations', () => {
	it('keeps cancelled reservations out of the daily review list', async () => {
		const rows = await rpc<ManualSalesRow[]>('report_manual_sales', { p_date: date });
		expect(rows.some((r) => r.resnumber === cancelled.resnumber)).toBe(false);
	});

	it('still lists non-cancelled reservations normally', async () => {
		const rows = await rpc<ManualSalesRow[]>('report_manual_sales', { p_date: date });
		const hit = rows.find((r) => r.resnumber === active.resnumber);
		expect(hit).toBeDefined();
		expect(hit!.is_cancelled).toBe(false);
	});

	it('leaves no cancelled lines among the items used for the day, flagging them only on request', async () => {
		const byDefault = await rpc<ManualSalesRow[]>('report_manual_sales', { p_date: date });
		expect(byDefault.every((r) => !r.is_cancelled)).toBe(true);
		// The cancelled line is still auditable when explicitly included, and
		// arrives flagged so it cannot be mistaken for an active item.
		const included = await rpc<ManualSalesRow[]>('report_manual_sales', {
			p_date: date,
			p_include_cancelled: true
		});
		const flagged = included.find((r) => r.resnumber === cancelled.resnumber);
		expect(flagged).toBeDefined();
		expect(flagged!.is_cancelled).toBe(true);
	});

	it('keeps the cancelled stay findable in date search, marked as cancelled', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', { p_date: date, p_mode: 'arrivals' });
		const hit = rows.find((r) => r.resnumber === cancelled.resnumber);
		expect(hit).toBeDefined();
		expect(hit!.rescancelled).toBe(true);
	});
});
