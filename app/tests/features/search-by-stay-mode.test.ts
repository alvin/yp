// Story: spec/features/search-by-stay-mode.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import {
	addDays,
	makeReservation,
	roomWindows,
	rpc,
	searchByDate,
	staffClient,
	unwrap,
	type Fixture
} from '../helpers/db';

interface RangeRow {
	resnumber: number;
	match_type: string;
}

function searchRange(from: string, to: string, mode: string): Promise<RangeRow[]> {
	return rpc<RangeRow[]>('search_by_date_range', { p_from: from, p_to: to, p_mode: mode });
}

const matchOf = async (date: string, mode: string, fx: Fixture) =>
	(await searchByDate(date, mode)).find((r) => r.resnumber === fx.resnumber)?.match_type;

let fx: Fixture; // three nights in a room, on dates of its own
let mid: string;

beforeAll(async () => {
	fx = await makeReservation({ nights: 3 });
	mid = addDays(fx.arrival, 1);
});

describe('search by stay mode — one date', () => {
	it('lists the stays leaving that day as departures, and none only arriving or staying over', async () => {
		expect(await matchOf(fx.departure, 'departures', fx)).toBe('departure');
		expect(await matchOf(fx.arrival, 'departures', fx)).toBeUndefined();
		expect(await matchOf(mid, 'departures', fx)).toBeUndefined();
	});

	it('lists arrivals and departures together in Both', async () => {
		expect(await matchOf(fx.arrival, 'both', fx)).toBe('arrival');
		expect(await matchOf(fx.departure, 'both', fx)).toBe('departure');
		expect(await matchOf(mid, 'both', fx)).toBeUndefined();
	});

	it('runs In house and Occupancy as one search, labelling each stay by what it does that day', async () => {
		for (const [day, kind] of [
			[fx.arrival, 'arrival'],
			[mid, 'in_house'],
			[fx.departure, 'departure']
		]) {
			expect(await matchOf(day, 'in_house', fx), day).toBe(kind);
			expect(await searchByDate(day, 'occupancy'), day).toEqual(await searchByDate(day, 'in_house'));
		}
	});

	it('no longer counts a room taken off the stay', async () => {
		const stay = await makeReservation();
		const day = addDays(stay.arrival, 1);
		expect(await matchOf(day, 'in_house', stay)).toBe('in_house');
		const db = await staffClient();
		const [room] = await roomWindows(stay);
		unwrap(
			await db
				.from('room_assignments')
				.update({ occupancyarchive: true })
				.eq('occupancyid', room.occupancyid)
				.select('occupancyid')
		);
		expect(await matchOf(day, 'in_house', stay)).toBeUndefined();
		expect(await matchOf(day, 'occupancy', stay)).toBeUndefined();
	});
});

describe('search by stay mode — a date range', () => {
	let long: Fixture; // five nights; the range sits strictly inside them
	let from: string;
	let to: string;

	const page = useAppPage();

	beforeAll(async () => {
		long = await makeReservation({ nights: 5 });
		from = addDays(long.arrival, 1);
		to = addDays(long.arrival, 3);
	});

	it('lists a stay overlapping the range in Both, labelled Overlapping, though it arrives before and leaves after', async () => {
		const hit = (await searchRange(from, to, 'overlap')).find((r) => r.resnumber === long.resnumber);
		expect(hit?.match_type).toBe('overlap');
	});

	it('lists in Arrivals and Departures only the stays arriving or leaving within the range', async () => {
		for (const mode of ['arrivals', 'departures']) {
			const rows = await searchRange(from, to, mode);
			expect(rows.map((r) => r.resnumber), mode).not.toContain(long.resnumber);
		}
		const arriving = await searchRange(long.arrival, to, 'arrivals');
		expect(arriving.find((r) => r.resnumber === long.resnumber)?.match_type).toBe('arrival');
		const leaving = await searchRange(from, long.departure, 'departures');
		expect(leaving.find((r) => r.resnumber === long.resnumber)?.match_type).toBe('departure');
	});

	it('matches the rooms held over the range in In house, labelling each row In house', async () => {
		await page.goto(`${APP_URL}/date?mode=in_house&from=${from}&to=${to}`, {
			waitUntil: 'networkidle'
		});
		const row = page.locator('tbody tr', { hasText: `#${long.resnumber}` });
		await expect.poll(() => row.count(), { timeout: 10_000 }).toBe(1);
		// One kind of match: no section headings, the label on the row instead.
		expect(await page.locator('h2').count()).toBe(0);
		expect(await row.locator('[data-slot=badge]').last().textContent()).toBe('In house');
	});
});
