// Story: spec/features/show-guest-first-name.feature
import { describe, expect, it, beforeAll } from 'vitest';
import { rpc, uid } from '../helpers/db';

let lastname: string;
let guestid: number;

beforeAll(async () => {
	lastname = `ZZFirst-${uid()}`;
	guestid = await rpc<number>('create_guest', { p_lastname: lastname, p_firstname: 'Morgan' });
});

describe('show guest first name', () => {
	it('carries the first name as its own field in name-search rows', async () => {
		const rows = await rpc<{ guestid: number; guestfirstname: string | null }[]>(
			'search_guests_by_name',
			{ p_query: lastname }
		);
		expect(rows.find((r) => r.guestid === guestid)?.guestfirstname).toBe('Morgan');
	});

	it('matches searches against the first name too', async () => {
		const rows = await rpc<{ guestid: number }[]>('search_guests_by_name', { p_query: 'Morgan' });
		expect(rows.some((r) => r.guestid === guestid)).toBe(true);
	});
});
