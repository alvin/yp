// Story: spec/features/find-charge-items-by-code.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, staffClient, unwrap, type Fixture } from '../helpers/db';
import { itemLabel, sortItemsByCode } from '../../src/lib/inventory';
import { filterOptions, type ComboboxOption } from '../../src/lib/components/ui/combobox/filter';
import type { InventoryItem } from '../../src/lib/data/types';

let page: Page;
let fx: Fixture;
let items: InventoryItem[];
let options: ComboboxOption[];

/** The entries an open dropdown is offering, in the order it offers them. */
async function shown(): Promise<string[]> {
	return page.locator('[data-testid=combobox-list] [role=option]').allTextContents();
}

async function openChargeDialog(): Promise<void> {
	await page.goto(APP_URL + `/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Charge', exact: true }).click();
	await page.getByRole('button', { name: 'Item / extra' }).click();
	await page.locator('#c-item').waitFor({ timeout: 15_000 });
}

/** Opens a dropdown and types into its search box. */
async function typeInto(trigger: string, text: string): Promise<void> {
	await page.click(trigger);
	await page.locator('[data-testid=combobox-list]').waitFor({ timeout: 10_000 });
	if (text) await page.keyboard.type(text);
	await page.waitForTimeout(150);
}

beforeAll(async () => {
	// The same price list the dropdown is built from: active items, code order.
	const db = await staffClient();
	items = sortItemsByCode(
		unwrap(await db.from('inventory_items').select('*').eq('invarchive', false)) as InventoryItem[]
	);
	options = items.map((i) => ({ value: String(i.inventoryid), label: itemLabel(i) }));
	fx = await makeReservation();
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('find charge items by code', () => {
	it('lists the items to be charged in item-code order', () => {
		const codes = items.map((i) => i.invcode.toUpperCase());
		// The code letters the price list is read by stay together and ascend.
		const letters = codes.map((c) => c[0]);
		expect(letters).toEqual([...letters].sort());
		// And within a letter the numbers run in order.
		const liquor = codes.filter((c) => c.startsWith('L'));
		expect(liquor.length).toBeGreaterThan(1);
		expect(liquor).toEqual([...liquor].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })));
	});

	it('narrows the list to entries containing what was typed', () => {
		const matches = filterOptions(options, 'L0');
		expect(matches.length).toBeGreaterThan(0);
		expect(matches.length).toBeLessThan(options.length);
		expect(matches.every((o) => o.label.toLowerCase().includes('l0'))).toBe(true);
	});

	it('lists entries starting with what was typed first', () => {
		const list: ComboboxOption[] = [
			{ value: '1', label: 'X99 · Bug spray' },
			{ value: '2', label: 'L01 · X99 house red' },
			{ value: '3', label: 'X99b · Bug spray, large' }
		];
		expect(filterOptions(list, 'x99').map((o) => o.value)).toEqual(['1', '3', '2']);
	});

	it('finds items by their description when the code is not known', () => {
		const wine = items.find((i) => (i.invitemdescription ?? '').toLowerCase().includes('wine'));
		expect(wine, 'the price list has a wine item to search for').toBeDefined();
		const matches = filterOptions(options, 'wine');
		expect(matches.map((o) => o.value)).toContain(String(wine!.inventoryid));
	});

	it('narrows the dropdown on screen as an item code is typed', async () => {
		await openChargeDialog();
		await typeInto('#c-item', '');
		const all = await shown();
		expect(all).toHaveLength(items.length);
		expect(all[0]).toContain(items[0].invcode);

		await page.keyboard.type('L');
		await expect
			.poll(async () => (await shown()).length, { timeout: 10_000 })
			.toBeLessThan(all.length);
		const liquor = await shown();
		expect(liquor.length).toBeGreaterThan(0);
		// Everything offered matches, and the L codes lead.
		expect(liquor.every((label) => label.toLowerCase().includes('l'))).toBe(true);
		expect(liquor[0].trimStart().toUpperCase().startsWith('L')).toBe(true);

		await page.keyboard.press('Backspace');
		await page.keyboard.type('X');
		await expect
			.poll(async () => (await shown())[0]?.trimStart().toUpperCase().startsWith('X'), {
				timeout: 10_000
			})
			.toBe(true);
	});

	it('brings the list price onto the charge line when an item is chosen', async () => {
		await openChargeDialog();
		const priced = items.find((i) => Number(i.invamount ?? 0) > 0)!;
		await typeInto('#c-item', priced.invcode);
		await page.locator('[data-testid=combobox-list] [role=option]').first().click();

		await expect
			.poll(async () => Number(await page.inputValue('#c-unit')), { timeout: 10_000 })
			.toBeCloseTo(Number(priced.invamount), 2);
		expect(await page.locator('#c-item').textContent()).toContain(priced.invcode);
	});

	it('uses the same dropdown for rooms', async () => {
		await openChargeDialog();
		await page.getByRole('button', { name: 'Room night' }).click();
		await typeInto('#c-room', '');
		const all = await shown();
		expect(all.length).toBeGreaterThan(1);

		// Any part of a room's name narrows it the same way an item code does.
		const fragment = all[all.length - 1].trim().slice(0, 6);
		await page.keyboard.type(fragment);
		await expect
			.poll(async () => (await shown()).length, { timeout: 10_000 })
			.toBeLessThan(all.length);
		expect((await shown()).every((r) => r.toLowerCase().includes(fragment.toLowerCase()))).toBe(
			true
		);
	});
});
