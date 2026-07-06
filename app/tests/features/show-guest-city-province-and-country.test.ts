// Story: spec/features/show-guest-city-province-and-country.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { rpc, uid } from '../helpers/db';

let guestid: number;
let lastname: string;
let page: Page;

beforeAll(async () => {
	lastname = `ZZCity-${uid()}`;
	guestid = await rpc<number>('create_guest', {
		p_lastname: lastname,
		p_city: 'Chemainus',
		p_region: 'BC',
		p_country: 'CAN'
	});
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('show guest city, province, and country', () => {
	it('returns city and region in name-search rows', async () => {
		const rows = await rpc<{ guestid: number; guestcity: string; guestregion: string }[]>(
			'search_guests_by_name',
			{ p_query: lastname }
		);
		const row = rows.find((r) => r.guestid === guestid);
		expect(row?.guestcity).toBe('Chemainus');
		expect(row?.guestregion).toBe('BC');
	});

	it('shows city, province, and country on the guest screen', async () => {
		await page.goto(`${APP_URL}/guests/${guestid}`, { waitUntil: 'networkidle' });
		const body = await page.textContent('body');
		expect(body).toContain('Chemainus');
		expect(body).toContain('BC');
		expect(body).toContain('CAN');
	});
});
