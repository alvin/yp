// Story: spec/features/correct-a-guests-details.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { rpc, staffClient, uid, unwrap } from '../helpers/db';

interface GuestRow {
	guestlastname: string;
	guestfirstname: string | null;
	guestsalutation: string | null;
	guestcity: string | null;
	guestsecondaryphone: string | null;
	guestprimaryphonetype: string | null;
	guestcompany: string | null;
}

let page: Page;
let guestid: number;
let surname: string;

async function guest(): Promise<GuestRow> {
	const db = await staffClient();
	return (
		unwrap(
			await db
				.from('guests')
				.select(
					'guestlastname, guestfirstname, guestsalutation, guestcity, guestsecondaryphone, guestprimaryphonetype, guestcompany'
				)
				.eq('guestid', guestid)
		) as GuestRow[]
	)[0];
}

beforeAll(async () => {
	surname = `ZZCorrect${uid()}`;
	guestid = await rpc<number>('create_guest', {
		p_lastname: surname,
		p_firstname: 'Robin',
		p_salutation: 'Mr.',
		p_city: 'Nanaimo',
		p_primaryphone: '(250) 555-0110',
		p_primaryphonetype: 'Phone - Home',
		p_secondaryphone: '(250) 555-0111',
		p_company: 'Kept Co'
	});
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe("correct a guest's details", () => {
	it('opens every field for editing and saves the corrections', async () => {
		await page.goto(`${APP_URL}/guests/${guestid}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Edit details' }).click();
		const dialog = page.getByRole('dialog');
		await dialog.locator('#ln').waitFor({ timeout: 10_000 });
		expect(await dialog.locator('#ph2').inputValue()).toBe('(250) 555-0111');

		await dialog.locator('#ci').fill('Ladysmith');
		await dialog.locator('#ph2').fill('');
		await page.click('#slt');
		await page.locator('[data-testid=combobox-list] [role=option]', { hasText: '—' }).first().click();
		await page.click('#ph-type');
		await page.locator('[data-testid=combobox-list] [role=option]', { hasText: '—' }).first().click();
		await dialog.getByRole('button', { name: 'Save details' }).click();
		await page.getByText('Guest details saved').waitFor({ timeout: 10_000 });

		expect(await guest()).toEqual({
			guestlastname: surname,
			guestfirstname: 'Robin',
			guestsalutation: null,
			guestcity: 'Ladysmith',
			guestsecondaryphone: null,
			guestprimaryphonetype: null,
			// Not on the form, so left as it was.
			guestcompany: 'Kept Co'
		});
		expect(await page.textContent('body')).toContain('Ladysmith');
	});

	it('will not save an empty last name', async () => {
		await page.getByRole('button', { name: 'Edit details' }).click();
		const dialog = page.getByRole('dialog');
		await dialog.locator('#ln').fill('');
		expect(await dialog.getByRole('button', { name: 'Save details' }).isDisabled()).toBe(true);
		await expect(rpc('update_guest', { p_guestid: guestid, p_lastname: ' ' })).rejects.toThrow(
			/last name is required/i
		);
		expect((await guest()).guestlastname).toBe(surname);
	});

	it('shows a value on file even when it is not on the lodge list', async () => {
		const older = await rpc<number>('create_guest', {
			p_lastname: `ZZOlder${uid()}`,
			p_primaryphone: '(250) 555-0120',
			p_primaryphonetype: 'Phone'
		});
		await page.goto(`${APP_URL}/guests/${older}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Edit details' }).click();
		await page.getByRole('dialog').locator('#ph-type').waitFor({ timeout: 10_000 });
		expect((await page.getByRole('dialog').locator('#ph-type').textContent())?.trim()).toBe('Phone');
	});
});

