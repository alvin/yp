// Story: spec/features/search-guests-by-partial-name.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { rpc, uid } from '../helpers/db';

interface NameRow {
	guestid: number;
	guest_name: string;
	guestlastname: string;
}

function search(query: string): Promise<NameRow[]> {
	return rpc<NameRow[]>('search_guests_by_name', { p_query: query });
}

let page: Page;
let u: string;
// Guest last names are varchar(25), so the fixtures keep the distinctive
// fragment the search is exercised with plus a short unique tail.
let surname: string; // ZZillington… — the client's "-illington" case
let cousin: string; // shares the stem, differs after it
let guestid: number;
let firmName: string; // filed against a guest, but not part of their name
let firmGuestId: number;

beforeAll(async () => {
	u = uid();
	surname = `ZZillington${u}`;
	cousin = `ZZillingham${u}`;
	guestid = await rpc<number>('create_guest', {
		p_lastname: surname,
		p_firstname: 'Karen',
		p_city: 'Ladysmith',
		p_region: 'BC'
	});
	await rpc<number>('create_guest', { p_lastname: cousin, p_firstname: 'Ray' });
	firmName = `ZZFirm${u}`;
	firmGuestId = await rpc<number>('create_guest', {
		p_lastname: `ZZEmployee${u}`,
		p_firstname: 'Dana',
		p_company: firmName
	});
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('search guests by partial name', () => {
	it('matches the middle or end of a surname, not only its start', async () => {
		const rows = await search(`illington${u}`);
		expect(rows.map((r) => r.guestid)).toContain(guestid);
	});

	it('ignores placeholder punctuation typed for the forgotten part of a name', async () => {
		for (const typed of [`-illington${u}`, `illington${u}.`, `*illington${u}`]) {
			const rows = await search(typed);
			expect(rows.map((r) => r.guestid), `typed "${typed}"`).toContain(guestid);
		}
	});

	it('narrows the list as more characters are typed, keeping the match', async () => {
		const broad = await search('ZZilling');
		const narrow = await search('ZZillington');
		expect(broad.map((r) => r.guestid)).toEqual(expect.arrayContaining([guestid]));
		expect(broad.length).toBeGreaterThan(narrow.length);
		expect(narrow.map((r) => r.guestid)).toContain(guestid);
		expect(narrow.every((r) => r.guestlastname.toLowerCase().includes('zzillington'))).toBe(true);
	});

	it('requires every keyword typed to appear in the name', async () => {
		const both = await search(`${surname} Karen`);
		expect(both.map((r) => r.guestid)).toContain(guestid);
		// 'Ray' belongs to the other guest, so the pair matches nobody.
		expect(await search(`${surname} Ray`)).toEqual([]);
	});

	it('reads the names on the guest record and nothing else', async () => {
		// The record carries a company, but a name search is a search of names.
		expect((await search(firmName)).map((r) => r.guestid)).not.toContain(firmGuestId);
		expect((await search(`ZZEmployee${u}`)).map((r) => r.guestid)).toContain(firmGuestId);
	});

	it('searches the same way from the lookup screen', async () => {
		await page.goto(APP_URL + '/', { waitUntil: 'networkidle' });
		await page.getByRole('tab', { name: 'Name', exact: true }).click();
		await page.fill('#name-q', `-illington${u}`);
		await page
			.locator('[data-testid=guest-matches]')
			.getByText(surname, { exact: false })
			.first()
			.waitFor({ timeout: 15_000 });
	});

	it('searches the same way from the new-reservation guest lookup', async () => {
		await page.goto(APP_URL + '/reservations/new', { waitUntil: 'networkidle' });
		// Part of the name only — the whole name never has to be spelled out.
		await page.fill('#guest-q', `illington${u}`);
		await page
			.locator('[data-testid=guest-matches]')
			.getByText(surname, { exact: false })
			.first()
			.waitFor({ timeout: 15_000 });
	});
});
