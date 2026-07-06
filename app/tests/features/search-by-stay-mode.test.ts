// Story: spec/features/search-by-stay-mode.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, type Fixture } from '../helpers/db';

interface DateRow {
	resnumber: number;
	match_type: string;
}

let fx: Fixture;
let midStay: string;

beforeAll(async () => {
	fx = await makeReservation({ nights: 3 });
	midStay = addDays(fx.arrival, 1);
});

describe('search by stay mode', () => {
	it('supports departure date searches', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: fx.departure,
			p_mode: 'departures'
		});
		expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(true);
	});

	it('supports combined arrival and departure searches', async () => {
		const onArrival = await rpc<DateRow[]>('search_by_date', {
			p_date: fx.arrival,
			p_mode: 'both'
		});
		expect(onArrival.some((r) => r.resnumber === fx.resnumber)).toBe(true);
		const onDeparture = await rpc<DateRow[]>('search_by_date', {
			p_date: fx.departure,
			p_mode: 'both'
		});
		expect(onDeparture.some((r) => r.resnumber === fx.resnumber)).toBe(true);
	});

	it('supports in-house searches for a mid-stay date', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: midStay,
			p_mode: 'in_house'
		});
		expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(true);
	});

	it('supports occupancy-based searches', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: midStay,
			p_mode: 'occupancy'
		});
		expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(true);
	});
});
