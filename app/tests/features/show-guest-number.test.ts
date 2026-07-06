// Story: spec/features/show-guest-number.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { rpc, uid } from '../helpers/db';

let guestid: number;
let page: Page;

beforeAll(async () => {
	guestid = await rpc<number>('create_guest', { p_lastname: `ZZNum-${uid()}`, p_firstname: 'Kim' });
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('show guest number', () => {
	it('returns the guest number in search rows', async () => {
		const rows = await rpc<{ guestid: number }[]>('search_guests_by_name', { p_query: 'ZZNum-' });
		expect(rows.some((r) => r.guestid === guestid)).toBe(true);
	});

	it('shows the guest number on the guest screen', async () => {
		await page.goto(`${APP_URL}/guests/${guestid}`, { waitUntil: 'networkidle' });
		const body = await page.textContent('body');
		expect(body).toContain(`Guest #${guestid}`);
	});
});
