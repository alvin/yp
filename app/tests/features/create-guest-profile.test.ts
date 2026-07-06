// Story: spec/features/create-guest-profile.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, rpc, staffClient, todayISO, uid, unwrap } from '../helpers/db';

let page: Page;

beforeAll(async () => {
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('create guest profile', () => {
	it('starts a new guest profile from the reservation workspace', async () => {
		await page.goto(`${APP_URL}/reservations/new`, { waitUntil: 'networkidle' });
		await page.waitForSelector('#ln');
		expect(await page.isVisible('#fn')).toBe(true);
	});

	it('captures name and contact details before saving the stay, and uses the profile for the reservation', async () => {
		const lastname = `ZZProf${uid()}`;
		await page.goto(`${APP_URL}/reservations/new`, { waitUntil: 'networkidle' });
		await page.fill('#ln', lastname);
		await page.fill('#fn', 'Uma');
		await page.fill('#ph', '(250) 555-0808');
		await page.fill('#arr', todayISO());
		await page.fill('#dep', addDays(todayISO(), 2));
		await page.fill('#bb', 'QA');
		await page.click('text=Save reservation');
		await page.waitForURL(/\/reservations\/\d+$/, { timeout: 20_000 });

		const client = await staffClient();
		const g = unwrap(
			await client
				.from('guests')
				.select('guestid, guestprimaryphone')
				.eq('guestlastname', lastname)
		) as { guestid: number; guestprimaryphone: string }[];
		expect(g).toHaveLength(1);
		expect(g[0].guestprimaryphone).toBe('(250) 555-0808');
		const history = await rpc<{ resnumber: number }[]>('guest_history', {
			p_guestid: g[0].guestid
		});
		expect(history.length).toBe(1);
	});

	it('keeps the workflow focused on the reservation (lands on the transaction screen)', async () => {
		expect(page.url()).toMatch(/\/reservations\/\d+$/);
	});
});
