// Story: spec/features/show-guest-email-information.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { rpc, uid } from '../helpers/db';

let guestid: number;
let lastname: string;
let email: string;
let page: Page;

beforeAll(async () => {
	lastname = `ZZMail-${uid()}`;
	email = `${lastname.toLowerCase()}@example.com`;
	guestid = await rpc<number>('create_guest', { p_lastname: lastname, p_email: email });
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('show guest email information', () => {
	it('returns the email address in name-search rows', async () => {
		const rows = await rpc<{ guestid: number; guestemailaddress: string | null }[]>(
			'search_guests_by_name',
			{ p_query: lastname }
		);
		expect(rows.find((r) => r.guestid === guestid)?.guestemailaddress).toBe(email);
	});

	it('shows the email as a mail link on the guest screen', async () => {
		await page.goto(`${APP_URL}/guests/${guestid}`, { waitUntil: 'networkidle' });
		const href = await page.getAttribute(`a[href="mailto:${email}"]`, 'href');
		expect(href).toBe(`mailto:${email}`);
	});
});
