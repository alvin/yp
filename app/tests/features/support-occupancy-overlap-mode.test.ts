// Story: spec/features/support-occupancy-overlap-mode.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, type Fixture } from '../helpers/db';

interface RangeRow {
	reservationid: number;
	resnumber: number;
	guest_name: string;
	arrival_date: string;
	departure_date: string;
	rooms: string | null;
	match_type: string;
}

let fx: Fixture;
let windowFrom: string;
let windowTo: string;

beforeAll(async () => {
	// A five-night stay; the search window sits strictly inside it, so both
	// the arrival and the departure fall outside the window.
	fx = await makeReservation({ nights: 5 });
	windowFrom = addDays(fx.arrival, 1);
	windowTo = addDays(fx.arrival, 3);
});

describe('support occupancy overlap mode', () => {
	it('returns stays that overlap the selected window', async () => {
		const rows = await rpc<RangeRow[]>('search_by_date_range', {
			p_from: windowFrom,
			p_to: windowTo,
			p_mode: 'overlap'
		});
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit).toBeDefined();
		// The stay overlaps even though its endpoints are outside the window.
		expect(hit!.arrival_date < windowFrom).toBe(true);
		expect(hit!.departure_date > windowTo).toBe(true);
	});

	it('reflects overlap matching rather than a single-point stay date', async () => {
		// Point modes miss the stay in the same window (arrival/departure are
		// outside it) while overlap mode finds it.
		const arrivals = await rpc<RangeRow[]>('search_by_date_range', {
			p_from: windowFrom,
			p_to: windowTo,
			p_mode: 'arrivals'
		});
		expect(arrivals.some((r) => r.resnumber === fx.resnumber)).toBe(false);
		const departures = await rpc<RangeRow[]>('search_by_date_range', {
			p_from: windowFrom,
			p_to: windowTo,
			p_mode: 'departures'
		});
		expect(departures.some((r) => r.resnumber === fx.resnumber)).toBe(false);
	});

	it('identifies each returned row as an overlap match', async () => {
		const rows = await rpc<RangeRow[]>('search_by_date_range', {
			p_from: windowFrom,
			p_to: windowTo,
			p_mode: 'overlap'
		});
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit!.match_type).toBe('overlap');
	});

	it('matches occupancy mode through the room-assignment window', async () => {
		// The fixture books a room for the whole stay, so its assignment
		// window overlaps the search window.
		const rows = await rpc<RangeRow[]>('search_by_date_range', {
			p_from: windowFrom,
			p_to: windowTo,
			p_mode: 'occupancy'
		});
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit).toBeDefined();
		expect(hit!.match_type).toBe('occupancy');
	});
});
