// Story: spec/features/show-secondary-phone-where-present.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { rpc, staffClient, uid, unwrap } from '../helpers/db';

let guestid: number;

beforeAll(async () => {
	guestid = await rpc<number>('create_guest', {
		p_lastname: `ZZPhone2-${uid()}`,
		p_primaryphone: '(250) 555-0100',
		p_primaryphonetype: 'Home',
		p_secondaryphone: '(250) 555-0199',
		p_secondaryphonetype: 'Cell'
	});
});

describe('show secondary phone where present', () => {
	it('stores the secondary phone and its type', async () => {
		const client = await staffClient();
		const g = unwrap(
			await client
				.from('guests')
				.select('guestsecondaryphone, guestsecondaryphonetype')
				.eq('guestid', guestid)
		) as { guestsecondaryphone: string; guestsecondaryphonetype: string }[];
		expect(g[0].guestsecondaryphone).toBe('(250) 555-0199');
		expect(g[0].guestsecondaryphonetype).toBe('Cell');
	});

	it('stays empty when no secondary phone is recorded', async () => {
		const bare = await rpc<number>('create_guest', { p_lastname: `ZZOnePhone-${Date.now()}` });
		const client = await staffClient();
		const g = unwrap(
			await client.from('guests').select('guestsecondaryphone').eq('guestid', bare)
		) as { guestsecondaryphone: string | null }[];
		expect(g[0].guestsecondaryphone).toBeNull();
	});
});
