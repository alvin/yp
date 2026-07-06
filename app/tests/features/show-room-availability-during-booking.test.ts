// Story: spec/features/show-room-availability-during-booking.feature

import { describe, expect, it } from 'vitest';
import { addDays, isolatedDate, makeReservation, rpc } from '../helpers/db';

interface RoomRow {
	roomid: number;
	roomorder: number | null;
	roomshorthand: string | null;
	room: string;
	is_available: boolean;
}

describe('show room availability during booking', () => {
	it('lists rooms in the lodge’s own room order', async () => {
		const rooms = await rpc<RoomRow[]>('room_directory');
		const orders = rooms.map((r) => r.roomorder ?? Number.MAX_SAFE_INTEGER);
		expect(orders).toEqual([...orders].sort((a, b) => a - b));
	});

	it('carries the brief bed-layout description per room', async () => {
		const rooms = await rpc<RoomRow[]>('room_directory');
		expect(rooms.some((r) => r.roomshorthand && r.roomshorthand.trim().length > 0)).toBe(true);
	});

	it('flags rooms occupied for the stay window as unavailable', async () => {
		const fx = await makeReservation();
		const rooms = await rpc<RoomRow[]>('room_directory', { p_in: fx.arrival, p_out: fx.departure });
		const booked = rooms.find((r) => !r.is_available);
		expect(booked).toBeDefined();
		// A different window on the same isolated date-block is free.
		const free = await rpc<RoomRow[]>('room_directory', {
			p_in: addDays(fx.departure, 10),
			p_out: addDays(fx.departure, 12)
		});
		expect(free.every((r) => r.is_available)).toBe(true);
	});

	it('does not let cancelled reservations block availability', async () => {
		const fx = await makeReservation();
		await rpc('cancel_reservation', {
			p_reservationid: fx.reservationid,
			p_date: fx.arrival,
			p_deposit_handling: 'none'
		});
		const rooms = await rpc<RoomRow[]>('room_directory', { p_in: fx.arrival, p_out: fx.departure });
		expect(rooms.every((r) => r.is_available)).toBe(true);
	});
});
