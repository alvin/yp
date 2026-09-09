// Story: spec/features/run-all-fields-search.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, uid, type Fixture } from '../helpers/db';

interface AllFieldsRow {
	guestid: number;
	reservationid: number | null;
	resnumber: number | null;
	guest_name: string;
	matched_on: string;
	detail: string;
}

let guestid: number;
let fx: Fixture;
// A second guest sharing the first's city but not their first name, so a
// two-keyword search has something to exclude.
let karenId: number;
let neighbourId: number;
let city: string;
let firstname: string;

beforeAll(async () => {
	guestid = await rpc<number>('create_guest', {
		p_lastname: `ZZAll-${uid()}`,
		p_primaryphone: '(250) 555-0199',
		p_address: '42 Unique Test Lane'
	});
	fx = await makeReservation();

	const u = uid();
	city = `ZZville${u}`;
	firstname = `Karen${u}`;
	karenId = await rpc<number>('create_guest', {
		p_lastname: `ZZKeyword-${u}`,
		p_firstname: firstname,
		p_city: city,
		p_region: 'BC'
	});
	neighbourId = await rpc<number>('create_guest', {
		p_lastname: `ZZNeighbr-${u}`,
		p_firstname: 'Sam',
		p_city: city,
		p_region: 'BC'
	});
});

describe('run all-fields search', () => {
	it('finds a guest from a phone-number fragment entered by the office', async () => {
		const rows = await rpc<AllFieldsRow[]>('search_all_fields', { p_query: '555-0199' });
		const hit = rows.find((r) => r.guestid === guestid);
		expect(hit).toBeDefined();
		expect(hit!.matched_on).toBe('primary phone');
	});

	it('matches details beyond name or reservation number, such as the address', async () => {
		const rows = await rpc<AllFieldsRow[]>('search_all_fields', { p_query: 'Unique Test Lane' });
		const hit = rows.find((r) => r.guestid === guestid);
		expect(hit).toBeDefined();
		expect(hit!.matched_on).toBe('address');
		expect(hit!.detail).toContain('42 Unique Test Lane');
	});

	it('returns only the records carrying every keyword entered', async () => {
		const one = await rpc<AllFieldsRow[]>('search_all_fields', { p_query: city });
		expect(one.map((r) => r.guestid)).toEqual(
			expect.arrayContaining([karenId, neighbourId])
		);

		// Both keywords together — the client's "Karen and Abbotsford" case.
		const both = await rpc<AllFieldsRow[]>('search_all_fields', {
			p_query: `${firstname} ${city}`
		});
		expect(both.map((r) => r.guestid)).toContain(karenId);
		expect(both.map((r) => r.guestid)).not.toContain(neighbourId);
	});

	it('lets the keywords land in different fields of the same record', async () => {
		const rows = await rpc<AllFieldsRow[]>('search_all_fields', {
			p_query: `${firstname} ${city}`
		});
		const hit = rows.find((r) => r.guestid === karenId)!;
		// One keyword matched the name, the other the address.
		expect(hit.matched_on).toContain('name');
		expect(hit.matched_on).toContain('address');
		expect(hit.detail).toContain(city);
	});

	it('returns each matching record once, naming the fields that matched', async () => {
		const rows = await rpc<AllFieldsRow[]>('search_all_fields', {
			p_query: `${firstname} ${city}`
		});
		expect(rows.filter((r) => r.guestid === karenId)).toHaveLength(1);
	});

	it('returns an openable reservation for a reservation-number match', async () => {
		const rows = await rpc<AllFieldsRow[]>('search_all_fields', {
			p_query: String(fx.resnumber)
		});
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit).toBeDefined();
		expect(hit!.matched_on).toBe('reservation number');
		// The row carries the ids the screen needs to open the reservation.
		expect(hit!.reservationid).toBe(fx.reservationid);
		expect(hit!.guest_name).toContain(fx.lastname);
	});
});
