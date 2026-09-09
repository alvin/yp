// Story: spec/features/return-more-name-matches-in-a-scrollable-list.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { rpc, uid } from '../helpers/db';

interface NameRow {
	guestid: number;
	guest_name: string;
	guestlastname: string;
}

// More than the handful the lookup used to stop at, so a common surname does
// not hide the guest being looked for.
const FAMILY_SIZE = 14;

let page: Page;
let stem: string;
let ids: number[] = [];

beforeAll(async () => {
	stem = `ZZMany${uid()}`;
	for (let n = 0; n < FAMILY_SIZE; n += 1) {
		ids.push(
			await rpc<number>('create_guest', {
				p_lastname: stem,
				p_firstname: `Guest${String(n).padStart(2, '0')}`,
				p_city: 'Ladysmith',
				p_region: 'BC'
			})
		);
	}
	// A near neighbour, so "closest match first" has something to beat.
	await rpc<number>('create_guest', { p_lastname: `${stem}son`, p_firstname: 'Farther' });
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('return more name matches in a scrollable list', () => {
	it('returns well beyond a handful of matches', async () => {
		const rows = await rpc<NameRow[]>('search_guests_by_name', { p_query: stem });
		const mine = rows.filter((r) => ids.includes(r.guestid));
		expect(mine).toHaveLength(FAMILY_SIZE);
	});

	it('lists the closest matches first', async () => {
		const rows = await rpc<NameRow[]>('search_guests_by_name', { p_query: stem });
		const exact = rows.findIndex((r) => r.guestlastname === stem);
		const farther = rows.findIndex((r) => r.guestlastname === `${stem}son`);
		expect(exact).toBeGreaterThanOrEqual(0);
		expect(farther).toBeGreaterThan(exact);
	});

	it('shows every match in a list that scrolls rather than cutting them short', async () => {
		await page.goto(APP_URL + '/', { waitUntil: 'networkidle' });
		await page.getByRole('tab', { name: 'Name', exact: true }).click();
		await page.fill('#name-q', stem);

		const list = page.locator('[data-testid=guest-matches]');
		const rows = list.locator('button');
		await rows.first().waitFor({ timeout: 15_000 });
		await expect.poll(() => rows.count(), { timeout: 15_000 }).toBeGreaterThanOrEqual(FAMILY_SIZE);

		// More content than fits: the panel scrolls instead of truncating.
		const overflows = await list.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
		expect(overflows).toBe(true);
	});

	it('opens a guest from further down the list, not only the first few', async () => {
		await page.goto(APP_URL + '/', { waitUntil: 'networkidle' });
		await page.getByRole('tab', { name: 'Name', exact: true }).click();
		await page.fill('#name-q', stem);

		const rows = page.locator('[data-testid=guest-matches] button');
		await rows.first().waitFor({ timeout: 15_000 });
		await expect.poll(() => rows.count(), { timeout: 15_000 }).toBeGreaterThanOrEqual(FAMILY_SIZE);

		const last = rows.nth(FAMILY_SIZE - 1);
		await last.scrollIntoViewIfNeeded();
		await last.click();
		await page.waitForURL(/\/guests\/\d+$/, { timeout: 20_000 });
	});
});
