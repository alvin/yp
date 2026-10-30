// Story: spec/features/maintain-item-prices.feature
//
// Items and item types the tests add are named ZZ…, so nothing else is ever
// charged at them; global setup clears them.

import { describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { useAppPage } from '../helpers/app';
import { adminClient, adminRpc, makeReservation, rpc, staffClient, todayISO, unwrap } from '../helpers/db';

interface ItemRow {
	inventoryid: number;
	invcode: string;
	invitemdescription: string | null;
	invtype: string | null;
	invamount: number | null;
	invgst: boolean;
	invpst: boolean;
	invlt: boolean;
	invrt: boolean;
	invdmt: boolean;
	invarchive: boolean;
	invnotes: string | null;
}

/** A code no item has: ZZ and three letters or digits. */
const newCode = () => `ZZ${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

async function itemByCode(code: string): Promise<ItemRow | undefined> {
	const db = await staffClient();
	const [row] = unwrap(
		await db
			.from('inventory_items')
			.select('*')
			.eq('invcode', code)
			.order('inventoryid', { ascending: false })
			.limit(1)
	) as ItemRow[];
	return row && { ...row, invamount: row.invamount == null ? null : Number(row.invamount) };
}

function saveItem(fields: Record<string, unknown>): Promise<number> {
	return adminRpc<number>('save_inventory_item', {
		p_inventoryid: null,
		p_description: 'Test item',
		p_invtype: 'Sundries',
		p_price: 10,
		...fields
	});
}

describe('maintain item prices', () => {
	it('adds an item, refuses a code already on the list, and disables it though it has been sold', async () => {
		const code = newCode();
		const id = await saveItem({
			p_invcode: code,
			p_invtype: 'Shirts and Clothing',
			p_price: 40,
			p_gst: true,
			p_pst: true
		});
		expect(await itemByCode(code)).toMatchObject({
			inventoryid: id,
			invtype: 'Shirts and Clothing',
			invamount: 40,
			invgst: true,
			invpst: true,
			invlt: false,
			invarchive: false
		});
		const db = await adminClient();
		const again = await db.rpc('save_inventory_item', {
			p_inventoryid: null,
			p_invcode: code.toLowerCase(),
			p_description: 'Second',
			p_invtype: null,
			p_price: 1
		});
		expect(again.error?.message).toBe(`${code.toLowerCase()} is already on the price list.`);

		// Notes, as on Access's Inventory Form: text sets them, an empty string
		// clears them, and leaving them out keeps them.
		const notes = async () => (await itemByCode(code))?.invnotes ?? null;
		const save = (extra: Record<string, unknown>) =>
			saveItem({ p_inventoryid: id, p_invcode: code, p_invtype: 'Shirts and Clothing', p_price: 40, ...extra });
		await save({ p_notes: 'Staff price $36.00' });
		expect(await notes()).toBe('Staff price $36.00');
		await save({});
		expect(await notes()).toBe('Staff price $36.00');
		await save({ p_notes: '' });
		expect(await notes()).toBeNull();

		// Sold, then disabled: the charge keeps naming it.
		const fx = await makeReservation();
		const tx = await rpc<number>('post_charge', {
			p_reservationguestid: fx.reservationguestid,
			p_inventoryid: id,
			p_quantity: 1,
			p_transdate: fx.arrival
		});
		await saveItem({
			p_inventoryid: id,
			p_invcode: code,
			p_invtype: 'Shirts and Clothing',
			p_price: 40,
			p_active: false
		});
		expect((await itemByCode(code))?.invarchive).toBe(true);
		const [line] = unwrap(
			await db.from('v_transaction_lines').select('description, invcode').eq('transactionid', tx)
		) as { description: string; invcode: string }[];
		expect(line).toEqual({ description: 'Test item', invcode: code });
	});

	it('charges an item at its price and taxes from the next charge on, leaving earlier charges as posted', async () => {
		const gst = Number(await rpc('effective_tax_rate', { p_taxratetype: 'GST', p_date: todayISO() }));
		expect(gst).toBeGreaterThan(0);
		const code = newCode();
		const id = await saveItem({ p_invcode: code, p_price: 10, p_gst: true });
		const fx = await makeReservation();
		const post = () =>
			rpc<number>('post_charge', {
				p_reservationguestid: fx.reservationguestid,
				p_inventoryid: id,
				p_quantity: 2,
				p_transdate: todayISO()
			});
		const first = await post();
		await saveItem({ p_inventoryid: id, p_invcode: code, p_price: 12.5, p_gst: false });
		const second = await post();
		const db = await staffClient();
		const lines = unwrap(
			await db
				.from('transactions')
				.select('transactionid, transamount, transgstamount')
				.in('transactionid', [first, second])
		) as { transactionid: number; transamount: number; transgstamount: number }[];
		const line = (tx: number) => {
			const l = lines.find((x) => x.transactionid === tx)!;
			return [Number(l.transamount), Number(l.transgstamount)];
		};
		expect(line(first)).toEqual([20, Math.round(20 * gst * 100) / 100]);
		expect(line(second)).toEqual([25, 0]);
	});

	it('adds an item type with the daily cash line its items post to', async () => {
		const type = `ZZ Hats ${newCode().slice(2)}`;
		await adminRpc('save_item_type', { p_inventorytype: type, p_transactiontype: 'Hats/Shirts' });
		const types = await rpc<{ inventorytype: string; transactiontype: string; items: number }[]>(
			'item_types'
		);
		expect(types.find((t) => t.inventorytype === type)).toEqual({
			inventorytype: type,
			transactiontype: 'Hats/Shirts',
			items: 0
		});
		const id = await saveItem({ p_invcode: newCode(), p_invtype: type, p_price: 20 });
		const fx = await makeReservation();
		const tx = await rpc<number>('post_charge', {
			p_reservationguestid: fx.reservationguestid,
			p_inventoryid: id,
			p_quantity: 1,
			p_transdate: fx.arrival
		});
		const db = await staffClient();
		const [line] = unwrap(
			await db.from('transactions').select('transtype').eq('transactionid', tx)
		) as { transtype: string }[];
		expect(line.transtype).toBe('Hats/Shirts');
		// The lodge's own types keep the lines they always had.
		expect(types.find((t) => t.inventorytype === 'Red Wine')?.transactiontype).toBe('Liquor');

		const refused = await (await adminClient()).rpc('save_item_type', {
			p_inventorytype: type,
			p_transactiontype: 'Room'
		});
		expect(refused.error?.message).toBe('Choose the daily cash line its charges post to.');
	});

	describe('on screen', () => {
		const page = useAppPage('/admin/item-prices', 'admin');

		const table = (p: Page, name: string) => p.locator(`table[aria-label="${name}"]`);
		const itemRow = (p: Page, code: string) =>
			table(p, 'Items').locator('tbody tr', {
				has: p.locator('td:first-child', { hasText: new RegExp(`^${code}$`) })
			});
		const drawer = (p: Page) => p.getByRole('dialog');
		const choose = async (p: Page, id: string, search: string, value: string) => {
			await p.locator(id).click();
			await p.locator('[data-slot="combobox-content"] input').fill(search);
			await p.locator(`[data-slot="combobox-content"] [data-option="${value}"]`).click();
		};

		it('lists the active items in code order, and narrows them as a search is typed', async () => {
			await table(page, 'Items').locator('tbody tr').first().waitFor();
			const db = await staffClient();
			const active = unwrap(
				await db.from('inventory_items').select('inventoryid, invcode').eq('invarchive', false)
			) as { inventoryid: number; invcode: string }[];
			active.sort(
				(x, y) =>
					x.invcode.localeCompare(y.invcode, 'en', { sensitivity: 'base', numeric: true }) ||
					x.inventoryid - y.inventoryid
			);
			const codes = () => table(page, 'Items').locator('tbody tr td:first-child').allInnerTexts();
			// A few Access codes carry a trailing space, which a cell doesn't show.
			expect(await codes()).toEqual(active.map((i) => i.invcode.trim()));
			await page.getByLabel('Search items').fill('hoodie');
			await expect.poll(async () => (await codes()).length).toBeLessThan(active.length);
			for (const row of await table(page, 'Items').locator('tbody tr').allInnerTexts()) {
				expect(row.toLowerCase()).toContain('hoodie');
			}
			await page.getByLabel('Search items').fill('');
		});

		it('adds an item in the drawer, changes it, disables it and enables it again', async () => {
			const code = newCode();
			await page.locator('main').getByRole('button', { name: 'Add item', exact: true }).click();
			expect(await drawer(page).getByRole('heading').innerText()).toBe('New item');
			await page.fill('#item-code', code);
			await page.fill('#item-description', 'Zip hoodie');
			await choose(page, '#item-type', 'shirts', 'Shirts and Clothing');
			await page.fill('#item-price', '58.04');
			await drawer(page).getByLabel('GST').check();
			await drawer(page).getByLabel('PST').check();
			await page.fill('#item-notes', 'Staff price $52.24');
			await drawer(page).getByRole('button', { name: 'Add item' }).click();
			await page.getByText(`Added ${code}`).waitFor();
			expect(await itemByCode(code)).toMatchObject({
				invitemdescription: 'Zip hoodie',
				invtype: 'Shirts and Clothing',
				invamount: 58.04,
				invgst: true,
				invpst: true,
				invlt: false,
				invrt: false,
				invdmt: false,
				invarchive: false,
				invnotes: 'Staff price $52.24'
			});
			await itemRow(page, code).waitFor();
			expect((await itemRow(page, code).locator('td').allInnerTexts()).slice(0, 5)).toEqual([
				code,
				'Zip hoodie',
				'Shirts and Clothing',
				'$58.04',
				'GST · PST'
			]);

			await itemRow(page, code).click();
			expect(await drawer(page).getByRole('heading').innerText()).toBe(`${code} · Zip hoodie`);
			await page.fill('#item-price', '60');
			await page.keyboard.press('Enter');
			await page.getByText(`Saved ${code}`).waitFor();
			expect((await itemByCode(code))?.invamount).toBe(60);

			await itemRow(page, code).click();
			await drawer(page).getByRole('button', { name: 'Disable item' }).click();
			await page.getByText(`Disabled ${code}`).waitFor();
			expect((await itemByCode(code))?.invarchive).toBe(true);
			await expect.poll(() => itemRow(page, code).count()).toBe(0);

			await page.getByLabel('Show disabled').check();
			expect(await itemRow(page, code).innerText()).toContain('Disabled');
			await itemRow(page, code).click();
			await drawer(page).getByRole('button', { name: 'Enable item' }).click();
			await page.getByText(`Enabled ${code}`).waitFor();
			expect((await itemByCode(code))?.invarchive).toBe(false);
			await page.getByLabel('Show disabled').uncheck();
		});

		it('adds an item type in the drawer with its daily cash line', async () => {
			const type = `ZZ Caps ${newCode().slice(2)}`;
			await page.getByRole('tab', { name: 'Item types' }).click();
			await page.locator('main').getByRole('button', { name: 'Add item type', exact: true }).click();
			await page.fill('#type-name', type);
			await choose(page, '#type-line', 'hats', 'Hats/Shirts');
			await drawer(page).getByRole('button', { name: 'Add item type' }).click();
			await page.getByText(`Added ${type}`).waitFor();
			const row = table(page, 'Item types').locator('tbody tr', { hasText: type });
			await row.waitFor();
			expect((await row.locator('td').allInnerTexts()).slice(0, 3)).toEqual([type, 'Hats/Shirts', '0']);
			expect(new URL(page.url()).searchParams.get('tab')).toBe('types');
		});
	});
});
