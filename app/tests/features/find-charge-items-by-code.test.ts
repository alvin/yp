// Story: spec/features/find-charge-items-by-code.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { makeReservation, staffClient, unwrap, type Fixture } from '../helpers/db';
import { filterOptions, type ComboboxOption } from '../../src/lib/components/ui/combobox/filter';

interface PriceListItem {
	inventoryid: number;
	invcode: string;
	invitemdescription: string | null;
	invamount: number | null;
}

const page = useAppPage();
let fx: Fixture;
let items: PriceListItem[];

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

/** Opens a dropdown, waits for its entries, and types into its search box. */
async function typeInto(trigger: string, text: string): Promise<void> {
	await page.click(trigger);
	await page.locator('[data-testid=combobox-list] [role=option]').first().waitFor({ timeout: 10_000 });
	if (text) await page.keyboard.type(text);
}

/** The code an entry in the item dropdown leads with. */
const codeOf = (label: string) => label.trim().split(/\s/)[0].toUpperCase();

beforeAll(async () => {
	// The price list the dropdown is built from: every active item.
	const db = await staffClient();
	items = unwrap(
		await db
			.from('inventory_items')
			.select('inventoryid, invcode, invitemdescription, invamount')
			.eq('invarchive', false)
	) as PriceListItem[];
	fx = await makeReservation();
});

describe('find charge items by code', () => {
	it('lists the items to be charged in item-code order', async () => {
		await openChargeDialog();
		await typeInto('#c-item', '');
		await expect.poll(async () => (await shown()).length, { timeout: 10_000 }).toBe(items.length);
		const codes = (await shown()).map(codeOf);
		// The code letters the price list is read by stay together and ascend…
		const letters = codes.map((c) => c[0]);
		expect(letters).toEqual([...letters].sort());
		// …and within a letter the numbers run in order: L2 before L10.
		const liquor = codes.filter((c) => c.startsWith('L')).map((c) => Number(c.slice(1)));
		expect(liquor.length).toBeGreaterThan(1);
		expect(liquor).toEqual([...liquor].sort((x, y) => x - y));
		await page.keyboard.press('Escape');
	});

	it('lists entries starting with what was typed first', () => {
		const list: ComboboxOption[] = [
			{ value: '1', label: 'X99 · Bug spray' },
			{ value: '2', label: 'L01 · X99 house red' },
			{ value: '3', label: 'X99b · Bug spray, large' }
		];
		expect(filterOptions(list, 'x99').map((o) => o.value)).toEqual(['1', '3', '2']);
	});

	it('finds items by their description when the code is not known', async () => {
		const wine = items.find((i) => /wine/i.test(i.invitemdescription ?? ''));
		expect(wine, 'the price list has a wine item to search for').toBeDefined();
		await openChargeDialog();
		await typeInto('#c-item', 'wine');
		await expect
			.poll(async () => (await shown()).some((o) => o.includes(wine!.invitemdescription!)), {
				timeout: 10_000
			})
			.toBe(true);
		await page.keyboard.press('Escape');
	});

	it('narrows the dropdown on screen as an item code is typed', async () => {
		await openChargeDialog();
		await typeInto('#c-item', '');
		await expect.poll(async () => (await shown()).length, { timeout: 10_000 }).toBe(items.length);
		const all = await shown();

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
