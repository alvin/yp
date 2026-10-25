// Story: spec/features/restrict-the-system-to-signed-in-staff.feature

import { afterAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAnonymousPage, useAppPage } from '../helpers/app';
import { anonClient, makeReservation, rpc, staffClient, uid, unwrap } from '../helpers/db';

let anonymous: Page | undefined;

afterAll(async () => {
	if (anonymous) await closeApp(anonymous);
});

describe('restrict the system to signed-in staff', () => {
	it('sends a visitor who has not signed in to the staff sign-in, from any screen', async () => {
		anonymous = await openAnonymousPage();
		for (const path of ['/', '/reservations/new', '/print', '/reports/dcar']) {
			await anonymous.goto(APP_URL + path, { waitUntil: 'networkidle' });
			expect(new URL(anonymous.url()).pathname, path).toBe('/login');
		}
	});

	it('gives anonymous connections no access to lodge data', async () => {
		const anon = anonClient();
		const table = await anon.from('guests').select('guestid').limit(1);
		expect(table.error?.code).toBe('42501');
		const call = await anon.rpc('search_guests_by_name', { p_query: 'a' });
		expect(call.error?.code).toBe('42501');
	});

	it('lets signed-in staff read and write front desk data', async () => {
		const lastname = `ZZAuth-${uid()}`;
		const guestid = await rpc<number>('create_guest', { p_lastname: lastname });
		const db = await staffClient();
		expect(unwrap(await db.from('guests').select('guestlastname').eq('guestid', guestid))).toEqual([
			{ guestlastname: lastname }
		]);
		const fx = await makeReservation();
		unwrap(
			await db
				.from('reservations')
				.update({ numadults: 3 })
				.eq('reservationid', fx.reservationid)
				.select('reservationid')
		);
	});

	describe('signing out', () => {
		const page = useAppPage();

		it('offers sign-out from the application header', async () => {
			await page.click('header button[title="Sign out"]');
			await page.waitForURL(`${APP_URL}/login`, { timeout: 15_000 });
			await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
			expect(new URL(page.url()).pathname).toBe('/login');
		});
	});
});
