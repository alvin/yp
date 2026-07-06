// Story: spec/features/show-guest-name.feature
import { describe, expect, it, beforeAll } from 'vitest';
import { rpc, staffClient, unwrap, uid } from '../helpers/db';

let lastname: string;
let guestid: number;

beforeAll(async () => {
	lastname = `ZZName-${uid()}`;
	guestid = await rpc<number>('create_guest', { p_lastname: lastname, p_firstname: 'Avery' });
});

describe('show guest name', () => {
	it('returns the guest name as "Last, First" in search results', async () => {
		const rows = await rpc<{ guestid: number; guest_name: string }[]>('search_guests_by_name', {
			p_query: lastname
		});
		expect(rows.find((r) => r.guestid === guestid)?.guest_name).toBe(`${lastname}, Avery`);
	});

	it('stores last and first name separately on the guest record', async () => {
		const client = await staffClient();
		const g = unwrap(
			await client.from('guests').select('guestlastname, guestfirstname').eq('guestid', guestid)
		) as { guestlastname: string; guestfirstname: string }[];
		expect(g[0].guestlastname).toBe(lastname);
		expect(g[0].guestfirstname).toBe('Avery');
	});
});
