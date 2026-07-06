// Story: spec/features/restrict-the-system-to-signed-in-staff.feature

import { afterAll, describe, expect, it } from 'vitest';
import { anonClient, rpc } from '../helpers/db';
import { APP_URL, closeApp, openAnonymousPage, openAppPage } from '../helpers/app';
import type { Page } from 'playwright';

const pages: Page[] = [];

afterAll(async () => {
	for (const p of pages) await closeApp(p);
});

describe('restrict the system to signed-in staff', () => {
	it('redirects unauthenticated visitors to the staff sign-in', async () => {
		const page = await openAnonymousPage();
		pages.push(page);
		await page.goto(APP_URL + '/reservations/new', { waitUntil: 'networkidle' });
		expect(page.url()).toContain('/login');
	});

	it('gives anonymous connections no access to lodge data', async () => {
		const anon = anonClient();
		const { error } = await anon.from('guests').select('guestid').limit(1);
		expect(error).not.toBeNull();
	});

	it('lets signed-in staff read and write front desk data', async () => {
		const guestid = await rpc<number>('create_guest', { p_lastname: `ZZAuth-${Date.now()}` });
		expect(guestid).toBeGreaterThan(0);
	});

	it('offers sign-out from the application header', async () => {
		const page = await openAppPage();
		pages.push(page);
		await page.click('header button[title="Sign out"]');
		await page.waitForURL(/\/login$/, { timeout: 15_000 });
		expect(page.url()).toContain('/login');
	});
});
