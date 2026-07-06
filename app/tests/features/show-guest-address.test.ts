// Story: spec/features/show-guest-address.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { rpc, staffClient, uid, unwrap } from '../helpers/db';

let guestid: number;
let page: Page;
const address = '4821 Test Harbour Road';

beforeAll(async () => {
	guestid = await rpc<number>('create_guest', {
		p_lastname: `ZZAddr-${uid()}`,
		p_address: address,
		p_city: 'Ladysmith',
		p_region: 'BC',
		p_country: 'CAN',
		p_pczip: 'V9G 1E5'
	});
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('show guest address', () => {
	it('stores the street address on the guest record', async () => {
		const client = await staffClient();
		const g = unwrap(
			await client.from('guests').select('guestaddress, guestpczip').eq('guestid', guestid)
		) as { guestaddress: string; guestpczip: string }[];
		expect(g[0].guestaddress).toBe(address);
		expect(g[0].guestpczip).toBe('V9G 1E5');
	});

	it('displays the address on the guest screen', async () => {
		await page.goto(`${APP_URL}/guests/${guestid}`, { waitUntil: 'networkidle' });
		const body = await page.textContent('body');
		expect(body).toContain(address);
	});
});
