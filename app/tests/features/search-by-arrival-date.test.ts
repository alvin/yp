// Story: spec/features/search-by-arrival-date.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, type Fixture } from '../helpers/db';

interface DateRow {
	reservationid: number;
	resnumber: number;
	guestlastname: string;
	arrival_date: string;
	departure_date: string;
	match_type: string;
}

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
});

describe('search by arrival date', () => {
	it('treats the selected date as an arrival-date search by default', async () => {
		// No p_mode: the function's default mode applies.
		const rows = await rpc<DateRow[]>('search_by_date', { p_date: fx.arrival });
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit).toBeDefined();
		expect(hit!.match_type).toBe('arrival');
	});

	it('shows reservations arriving on the chosen date', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: fx.arrival,
			p_mode: 'arrivals'
		});
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit).toBeDefined();
		expect(hit!.arrival_date).toBe(fx.arrival);
		expect(hit!.guestlastname).toBe(fx.lastname);
	});

	it('is driven from a single selected date', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: addDays(fx.arrival, 1),
			p_mode: 'arrivals'
		});
		expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(false);
	});

	it('lets staff open a listed reservation from the results', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: fx.arrival,
			p_mode: 'arrivals'
		});
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit).toBeDefined();
		const res = await rpc<{ reservationid: number; resnumber: number }[]>('find_reservation', {
			p_resnumber: hit!.resnumber
		});
		expect(res).toHaveLength(1);
		expect(res[0].reservationid).toBe(fx.reservationid);
	});
});
