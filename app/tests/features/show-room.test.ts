// Story: spec/features/show-room.feature

import { describe, expect, it } from 'vitest';
import { makeReservation, rpc } from '../helpers/db';

interface DateRow {
	resnumber: number;
	room: string | null;
}

describe('show room', () => {
	// Criteria "shows the room identifier" and "visible without opening the
	// reservation" are one assertion: the room label arrives on the search
	// result row itself.
	it('shows the room identifier on each result row without opening the reservation', async () => {
		const fx = await makeReservation(); // books the first room by default
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: fx.arrival,
			p_mode: 'arrivals'
		});
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit).toBeDefined();
		expect(hit!.room).toBeTruthy();
		expect(hit!.room).toContain(':'); // "Name: number" display format
	});

	it('clearly indicates when no room is assigned', async () => {
		const fx = await makeReservation({ roomid: null });
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: fx.arrival,
			p_mode: 'arrivals'
		});
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit).toBeDefined();
		expect(hit!.room ?? '').toBe('');
	});
});
