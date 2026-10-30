// Story: spec/features/report-items-sold-over-a-date-range.feature

import { beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, printedDate, useAppPage } from '../helpers/app';
import {
	addDays,
	adminRpc,
	makeReservation,
	postCharge,
	postRoomNights,
	staffClient,
	unwrap,
	type Fixture
} from '../helpers/db';

interface Line {
	cashed_out: string;
	inv_code: string;
	inv_type: string | null;
	resnumber: number;
	item: string;
	quantity: number;
	total: number;
}

interface Item {
	inventoryid: number;
	invcode: string;
	invtype: string;
	invamount: number;
}

/** Active, priced items of a type, each with a code no other active item shares. */
async function itemsOfType(type: string, count: number): Promise<Item[]> {
	const db = await staffClient();
	const items = unwrap(
		await db
			.from('inventory_items')
			.select('inventoryid, invcode, invtype, invamount')
			.eq('invarchive', false)
			.eq('invtype', type)
			.gt('invamount', 0)
			.order('inventoryid')
	) as Item[];
	const codes = items.map((i) => i.invcode);
	return items
		.filter((i) => codes.filter((c) => c === i.invcode).length === 1)
		.slice(0, count)
		.map((i) => ({ ...i, invamount: Number(i.invamount) }));
}

let fx: Fixture;
let shirt: Item;
let cap: Item;
let beer: Item;
let from: string;
let to: string;

beforeAll(async () => {
	[shirt, cap] = await itemsOfType('Shirts and Clothing', 2);
	[beer] = await itemsOfType('Beer and Cider', 1);
	fx = await makeReservation({ nights: 3 });
	from = fx.arrival;
	to = fx.departure;
	// Posted during the stay: cashed out on the check-out day.
	await postCharge(fx, { inventoryid: shirt.inventoryid, quantity: 2 });
	await postCharge(fx, { inventoryid: shirt.inventoryid, quantity: 1, transdate: addDays(fx.arrival, 1) });
	await postCharge(fx, { inventoryid: cap.inventoryid, quantity: 1 });
	await postCharge(fx, { inventoryid: beer.inventoryid, quantity: 4 });
	await postRoomNights(fx, 100);
	// Posted the day after check-out: cashed out that day, outside the range.
	await postCharge(fx, { inventoryid: beer.inventoryid, quantity: 1, transdate: addDays(to, 1) });
});

describe('report items sold over a date range', () => {
	it('lists every item cashed out between two dates, on its check-out day, with its type, rooms left out', async () => {
		const lines = await adminRpc<Line[]>('report_items_sold', { p_from: from, p_to: to });
		const sorted = [shirt, cap, beer].map((i) => i.invcode).sort();
		expect([...new Set(lines.map((l) => l.inv_code))].sort()).toEqual(sorted);
		for (const l of lines) {
			expect(l.cashed_out).toBe(to);
			expect(l.resnumber).toBe(fx.resnumber);
		}
		const qty = (code: string) =>
			lines.filter((l) => l.inv_code === code).reduce((s, l) => s + l.quantity, 0);
		expect([qty(shirt.invcode), qty(cap.invcode), qty(beer.invcode)]).toEqual([3, 1, 4]);
		expect(lines.find((l) => l.inv_code === beer.invcode)?.inv_type).toBe('Beer and Cider');

		// The charge posted after check-out counts on its own day.
		const after = await adminRpc<Line[]>('report_items_sold', { p_from: addDays(to, 1), p_to: addDays(to, 1) });
		expect(after.map((l) => [l.cashed_out, l.inv_code, l.quantity])).toEqual([
			[addDays(to, 1), beer.invcode, 1]
		]);
	});

	it('counts a line exactly as the daily Items Cashed Out appendix does', async () => {
		const daily = await adminRpc<Omit<Line, 'cashed_out' | 'inv_type'>[]>('report_items_cashed_out', {
			p_date: to
		});
		const range = await adminRpc<Line[]>('report_items_sold', { p_from: to, p_to: to });
		expect(range.map(({ cashed_out, inv_type, ...rest }) => rest)).toEqual(daily);
	});

	describe('on screen and on paper', () => {
		const page = useAppPage(undefined, 'admin');

		const subtotals = (p: Page) =>
			p
				.locator('.report-page tr', { hasText: 'subtotal' })
				.locator('td:first-child')
				.allInnerTexts();
		const option = (p: Page, value: string) =>
			p.locator(`[data-slot="combobox-content"] [data-option="${value}"]`);

		it('opens on the whole report for the dates, each line dated, with a subtotal for each code', async () => {
			await page.goto(`${APP_URL}/admin/sales?from=${from}&to=${to}`, { waitUntil: 'networkidle' });
			const sheet = (await page.textContent('.report-page')) ?? '';
			expect(sheet).toContain('Items Cashed Out');
			expect(sheet).toContain(`from ${printedDate(from)} to ${printedDate(to)}, by Inventory Code`);
			expect(await subtotals(page)).toEqual(
				[beer, cap, shirt]
					.map((i) => i.invcode)
					.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
					.map((c) => `${c} subtotal`)
			);
			const shirtTotal = page.locator('.report-page tr', { hasText: `${shirt.invcode} subtotal` });
			expect(await shirtTotal.locator('td').nth(6).textContent()).toBe('3');
			const dates = await page
				.locator('.report-page tbody tr', { hasText: String(fx.resnumber) })
				.locator('td:nth-child(2)')
				.allTextContents();
			expect(dates).toEqual(Array(4).fill(printedDate(to)));
			expect(await page.locator('#sales-items').count()).toBe(0);
		});

		const codes = (items: Item[]) =>
			items
				.map((i) => i.invcode)
				.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
				.map((c) => `${c} subtotal`);
		const ticked = (p: Page, value: string) => option(p, value).getAttribute('data-ticked');
		const action = (p: Page, name: string) =>
			p.locator('[data-slot="combobox-content"] button', { hasText: new RegExp(`^${name}$`) });

		it('lists only what is chosen under Selected: a whole type, less an item, plus another', async () => {
			await page.locator('.report-root nav a', { hasText: 'Selected' }).click();
			await page.waitForURL(/view=selected/);
			await page.getByText('No items chosen.').waitFor();
			expect(await page.locator('#sales-items').innerText()).toBe('Choose…');

			await page.locator('#sales-types').click();
			await option(page, 'Shirts and Clothing').click();
			expect(await ticked(page, 'Shirts and Clothing')).toBe('true');
			await page.keyboard.press('Escape');
			await expect.poll(() => subtotals(page)).toEqual(codes([cap, shirt]));
			expect(await page.locator('#sales-items').innerText()).toBe('2 of 3 items');
			expect(await page.locator('#sales-types').innerText()).toBe('Shirts and Clothing');

			await page.locator('#sales-items').click();
			await option(page, cap.invcode).click();
			await option(page, beer.invcode).click();
			expect(await ticked(page, cap.invcode)).toBe('false');
			await page.keyboard.press('Escape');
			await expect.poll(() => subtotals(page)).toEqual(codes([beer, shirt]));
			// The type is now only partly chosen: its box says so, and the button
			// names both types.
			expect(await page.locator('#sales-types').innerText()).toBe('2 types');
			await page.locator('#sales-types').click();
			expect(await ticked(page, 'Shirts and Clothing')).toBe('mixed');
			await page.keyboard.press('Escape');

			// Kept in the address: a reload lists the same.
			await page.reload({ waitUntil: 'networkidle' });
			expect(new URL(page.url()).searchParams.getAll('code').sort()).toEqual(
				[beer.invcode, shirt.invcode].sort()
			);
			expect(await subtotals(page)).toHaveLength(2);
		});

		it('selects and clears all, or only the matches for what is typed, and clears from the bar', async () => {
			// Clear on the bar: nothing chosen.
			await page.getByRole('button', { name: 'Clear', exact: true }).click();
			await page.getByText('No items chosen.').waitFor();
			expect(new URL(page.url()).searchParams.getAll('code')).toEqual([]);

			// Select all, in either dropdown, chooses everything.
			await page.locator('#sales-types').click();
			await action(page, 'Select all').click();
			await page.keyboard.press('Escape');
			await expect.poll(() => subtotals(page)).toEqual(codes([beer, cap, shirt]));
			expect(await page.locator('#sales-types').innerText()).toBe('All types');
			expect(await page.locator('#sales-items').innerText()).toBe('All items');

			// Typed into the search, Clear clears the matches alone.
			await page.locator('#sales-items').click();
			await page.locator('[data-slot="combobox-content"] input').fill(shirt.invcode);
			await action(page, 'Clear results').click();
			await page.keyboard.press('Escape');
			await expect.poll(() => subtotals(page)).toEqual(codes([beer, cap]));

			await page.locator('#sales-items').click();
			await action(page, 'Clear').click();
			await page.locator('[data-slot="combobox-content"] input').fill(shirt.invcode);
			await action(page, 'Select all results').click();
			expect(await action(page, 'Select all results').isDisabled()).toBe(true);
			await page.keyboard.press('Escape');
			await expect.poll(() => subtotals(page)).toEqual(codes([shirt]));

			await page.locator('.report-root nav a', { hasText: 'All items' }).click();
			await page.waitForURL((u) => !u.searchParams.has('view'));
			expect(await subtotals(page)).toHaveLength(3);
		});
	});
});
