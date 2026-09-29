// Story: spec/features/support-in-house-occupancy-mode.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

interface DateRow {
	resnumber: number;
	arrival_date: string;
	departure_date: string;
	match_type: string;
}

let fx: Fixture;
let midStay: string;

beforeAll(async () => {
	fx = await makeReservation({ nights: 3 });
	midStay = addDays(fx.arrival, 1); // neither the arrival nor the departure day
});

describe('support in-house occupancy mode', () => {
	it('returns stays occupied on the selected date', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: midStay,
			p_mode: 'in_house'
		});
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit).toBeDefined();
		expect(hit!.arrival_date < midStay && midStay < hit!.departure_date).toBe(true);
	});

	it('reflects in-house occupancy rather than arrival or departure mode', async () => {
		const arrivals = await rpc<DateRow[]>('search_by_date', {
			p_date: midStay,
			p_mode: 'arrivals'
		});
		expect(arrivals.some((r) => r.resnumber === fx.resnumber)).toBe(false);
		const departures = await rpc<DateRow[]>('search_by_date', {
			p_date: midStay,
			p_mode: 'departures'
		});
		expect(departures.some((r) => r.resnumber === fx.resnumber)).toBe(false);
	});

	it('identifies each returned row as an in-house occupancy match', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: midStay,
			p_mode: 'in_house'
		});
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit!.match_type).toBe('in_house');
	});
});

describe('support in-house occupancy mode — removed rooms', () => {
	it('no longer counts a room that has been removed from the stay', async () => {
		const stay = await makeReservation();
		const mid = addDays(stay.arrival, 1);
		const found = async () =>
			(await rpc<DateRow[]>('search_by_date', { p_date: mid, p_mode: 'in_house' })).some(
				(r) => r.resnumber === stay.resnumber
			);
		expect(await found()).toBe(true);

		const db = await staffClient();
		unwrap(
			await db
				.from('room_assignments')
				.update({ occupancyarchive: true })
				.eq('reservationguestid', stay.reservationguestid)
				.select('occupancyid')
		);
		expect(await found()).toBe(false);
	});
});
