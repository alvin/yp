// Story: spec/features/find-a-guest-by-guest-number.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { rpc, uid } from '../helpers/db';

interface AllFieldsRow {
	guestid: number | null;
	resnumber: number | null;
	matched_on: string;
	detail: string;
}

function search(query: string): Promise<AllFieldsRow[]> {
	return rpc<AllFieldsRow[]>('search_all_fields', { p_query: query });
}

let guestid: number;

beforeAll(async () => {
	guestid = await rpc<number>('create_guest', { p_lastname: `ZZNumbered${uid()}` });
});

describe('find a guest by guest number', () => {
	it('returns the guest, naming the guest number as the field that matched', async () => {
		const hit = (await search(String(guestid))).find((r) => r.guestid === guestid && r.resnumber == null);
		expect(hit?.matched_on).toContain('guest number');
		expect(hit?.detail).toContain(String(guestid));
	});

	it('matches the guest number only when it is entered in full', async () => {
		// A leading fragment of the number must not drag the guest in — a guest
		// number is an identifier you have in hand, not a field to browse.
		const fragment = String(guestid).slice(0, -1);
		const hit = (await search(fragment)).find((r) => r.guestid === guestid && r.resnumber == null);
		expect(hit?.matched_on ?? '').not.toContain('guest number');
	});
});
