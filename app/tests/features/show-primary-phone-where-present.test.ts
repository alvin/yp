// Story: spec/features/show-primary-phone-where-present.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { rpc, staffClient, uid, unwrap } from '../helpers/db';

let guestid: number;
let lastname: string;

beforeAll(async () => {
	lastname = `ZZPhone-${uid()}`;
	guestid = await rpc<number>('create_guest', {
		p_lastname: lastname,
		p_primaryphone: '(250) 555-0117',
		p_primaryphonetype: 'Cell'
	});
});

describe('show primary phone where present', () => {
	it('returns the primary phone in name-search rows', async () => {
		const rows = await rpc<{ guestid: number; guestprimaryphone: string | null }[]>(
			'search_guests_by_name',
			{ p_query: lastname }
		);
		expect(rows.find((r) => r.guestid === guestid)?.guestprimaryphone).toBe('(250) 555-0117');
	});

	it('stores the phone type alongside the number', async () => {
		const client = await staffClient();
		const g = unwrap(
			await client.from('guests').select('guestprimaryphonetype').eq('guestid', guestid)
		) as { guestprimaryphonetype: string }[];
		expect(g[0].guestprimaryphonetype).toBe('Cell');
	});

	it('leaves the phone empty when none is recorded', async () => {
		const bare = await rpc<number>('create_guest', { p_lastname: `ZZNoPhone-${uid()}` });
		const client = await staffClient();
		const g = unwrap(
			await client.from('guests').select('guestprimaryphone').eq('guestid', bare)
		) as { guestprimaryphone: string | null }[];
		expect(g[0].guestprimaryphone).toBeNull();
	});
});
