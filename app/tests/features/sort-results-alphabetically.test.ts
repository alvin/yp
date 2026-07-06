// Story: spec/features/sort-results-alphabetically.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { isolatedDate, makeReservation, rpc, uid } from '../helpers/db';

interface DateRow {
	resnumber: number;
	guestlastname: string;
	guestfirstname: string | null;
}

let arrival: string;
let lastA: string;
let lastB: string;

async function search(): Promise<DateRow[]> {
	return rpc<DateRow[]>('search_by_date', { p_date: arrival, p_mode: 'arrivals' });
}

beforeAll(async () => {
	const u = uid();
	arrival = isolatedDate();
	lastA = `ZZSortA-${u}`;
	lastB = `ZZSortB-${u}`;
	// Created out of alphabetical order on the same isolated date, so the
	// result order can only come from sorting. No rooms, so the stays can
	// share the date freely.
	await makeReservation({ arrival, nights: 2, lastname: lastB, roomid: null });
	await makeReservation({ arrival, nights: 2, lastname: lastA, firstname: 'Zed', roomid: null });
	await makeReservation({ arrival, nights: 2, lastname: lastA, firstname: 'Anna', roomid: null });
});

describe('sort results alphabetically', () => {
	it('orders results alphabetically by guest last name', async () => {
		const rows = await search();
		// The date is isolated, so exactly our three fixtures come back.
		expect(rows.map((r) => r.guestlastname)).toEqual([lastA, lastA, lastB]);
	});

	it('keeps the ordering consistent for the same search conditions', async () => {
		const first = await search();
		const second = await search();
		expect(second.map((r) => r.resnumber)).toEqual(first.map((r) => r.resnumber));
	});

	it('keeps guests with the same last name grouped together', async () => {
		const rows = await search();
		const positions = rows
			.map((r, i) => (r.guestlastname === lastA ? i : -1))
			.filter((i) => i >= 0);
		expect(positions).toHaveLength(2);
		expect(positions[1] - positions[0]).toBe(1);
		// Within the group, first names are alphabetical too.
		expect(rows[positions[0]].guestfirstname).toBe('Anna');
		expect(rows[positions[1]].guestfirstname).toBe('Zed');
	});
});
