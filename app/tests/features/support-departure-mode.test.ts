// Story: spec/features/support-departure-mode.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

interface DateRow {
	resnumber: number;
	departure_date: string;
	match_type: string;
}

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation({ nights: 3 });
});

describe('support departure mode', () => {
	it('returns stays that depart on the selected date', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: fx.departure,
			p_mode: 'departures'
		});
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit).toBeDefined();
		expect(hit!.departure_date).toBe(fx.departure);
	});

	it('reflects departures rather than another stay type', async () => {
		// The stay arrives (but does not depart) on its arrival date, so
		// departures mode must not return it there.
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: fx.arrival,
			p_mode: 'departures'
		});
		expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(false);
	});

	it('identifies each returned row as a departure match', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: fx.departure,
			p_mode: 'departures'
		});
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit!.match_type).toBe('departure');
	});
});
