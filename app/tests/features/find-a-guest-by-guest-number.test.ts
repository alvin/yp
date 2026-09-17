// Story: spec/features/find-a-guest-by-guest-number.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, uid, type Fixture } from '../helpers/db';

interface AllFieldsRow {
	guestid: number | null;
	reservationid: number | null;
	resnumber: number | null;
	guest_name: string;
	matched_on: string;
	detail: string;
}

function search(query: string): Promise<AllFieldsRow[]> {
	return rpc<AllFieldsRow[]>('search_all_fields', { p_query: query });
}

let guestid: number;
let fx: Fixture;

beforeAll(async () => {
	guestid = await rpc<number>('create_guest', { p_lastname: `ZZNumbered${uid()}` });
	fx = await makeReservation();
});

describe('find a guest by guest number', () => {
	it('returns the guest, naming the guest number as the field that matched', async () => {
		const rows = await search(String(guestid));
		const hit = rows.find((r) => r.guestid === guestid && r.resnumber == null);
		expect(hit).toBeDefined();
		expect(hit!.matched_on).toContain('guest number');
		expect(hit!.detail).toContain(String(guestid));
	});

	it('matches the guest number only when it is entered in full', async () => {
		// A leading fragment of the number must not drag the guest in — a guest
		// number is an identifier you have in hand, not a field to browse.
		const fragment = String(guestid).slice(0, -1);
		const rows = await search(fragment);
		const hit = rows.find((r) => r.guestid === guestid && r.resnumber == null);
		expect(hit?.matched_on ?? '').not.toContain('guest number');
	});

	it('still returns a reservation for a reservation number', async () => {
		const rows = await search(String(fx.resnumber));
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit).toBeDefined();
		expect(hit!.matched_on).toContain('reservation number');
		expect(hit!.reservationid).toBe(fx.reservationid);
	});
});
