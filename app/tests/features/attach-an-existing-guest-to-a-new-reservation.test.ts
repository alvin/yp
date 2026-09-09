// Story: spec/features/attach-an-existing-guest-to-a-new-reservation.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { rpc, uid } from '../helpers/db';

const ADDRESS = '742 Yellow Point Road';
const POSTAL = 'V9G 1E5';

let page: Page;
let surname: string;
let guestid: number;

/** Types part of the guest's name and picks them out of the match list. */
async function attach(): Promise<void> {
	await page.goto(APP_URL + '/reservations/new', { waitUntil: 'networkidle' });
	// Part of the name only — the returning guest is found from "Duni", not
	// from spelling the whole surname correctly.
	await page.fill('#guest-q', surname.slice(0, 8));
	const match = page
		.locator('[data-testid=guest-matches] button')
		.filter({ hasText: surname })
		.first();
	await match.waitFor({ timeout: 15_000 });
	await match.click();
	await page.locator('[data-testid=attached-guest]').waitFor({ timeout: 15_000 });
}

beforeAll(async () => {
	surname = `ZZReturning${uid()}`;
	guestid = await rpc<number>('create_guest', {
		p_lastname: surname,
		p_firstname: 'Pat',
		p_address: ADDRESS,
		p_city: 'Ladysmith',
		p_region: 'BC',
		p_country: 'CAN',
		p_pczip: POSTAL,
		p_primaryphone: '(250) 555-0142',
		p_email: 'pat@example.test'
	});
	page = await openAppPage();
	await attach();
});

afterAll(async () => {
	await closeApp(page);
});

describe('attach an existing guest to a new reservation', () => {
	it('finds an existing guest from part of their name', async () => {
		expect(await page.inputValue('#ln')).toBe(surname);
		expect(await page.inputValue('#fn')).toBe('Pat');
	});

	it('fills the whole stored record, including the street address', async () => {
		expect(await page.inputValue('#ad')).toBe(ADDRESS);
		expect(await page.inputValue('#pc')).toBe(POSTAL);
		expect(await page.inputValue('#ci')).toBe('Ladysmith');
		expect(await page.inputValue('#rg')).toBe('BC');
		expect(await page.inputValue('#cn')).toBe('CAN');
		expect(await page.inputValue('#ph')).toBe('(250) 555-0142');
		expect(await page.inputValue('#em')).toBe('pat@example.test');
	});

	it('attaches to the existing guest record rather than creating a second one', async () => {
		const badge = page.locator('[data-testid=attached-guest]');
		expect(await badge.textContent()).toContain(`#${guestid}`);
	});

	it('leaves the filled details editable before saving', async () => {
		await page.fill('#ad', '9 Corrected Lane');
		expect(await page.inputValue('#ad')).toBe('9 Corrected Lane');
		// Put the screen back the way the other assertions expect it.
		await attach();
		expect(await page.inputValue('#ad')).toBe(ADDRESS);
	});
});
