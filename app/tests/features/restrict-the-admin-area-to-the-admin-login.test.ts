// Story: spec/features/restrict-the-admin-area-to-the-admin-login.feature

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { adminClient, staffClient, todayISO, unwrap } from '../helpers/db';
import { ADMIN_EMAIL } from '../helpers/env';

const supabaseDir = join(__dirname, '..', '..', '..', 'supabase');

describe('restrict the admin area to the admin login', () => {
	it('creates the admin login in the seeds, keeping only its password hash', async () => {
		const config = readFileSync(join(supabaseDir, 'config.toml'), 'utf8');
		expect(config).toMatch(/^sql_paths = \["\.\/seed\.sql", "\.\/seed_admin\.sql"\]$/m);
		const seed = readFileSync(join(supabaseDir, 'seed_admin.sql'), 'utf8');
		expect(seed).toContain(`'${ADMIN_EMAIL}'`);
		expect(seed).toMatch(/'\$2a\$12\$[./A-Za-z0-9]{53}'/);
		// The hosted project's signup allowlist lets the seed create it there.
		const allowlist = readFileSync(join(supabaseDir, 'staging', 'staging_hardening.sql'), 'utf8');
		expect(allowlist).toContain(`('${ADMIN_EMAIL}'`);

		const db = await adminClient();
		const { data } = await db.auth.getUser();
		expect(data.user?.email).toBe(ADMIN_EMAIL);
	});

	it('refuses any other login’s changes to the taxes and prices, from the app or straight from the API', async () => {
		const db = await staffClient();
		// Each asks for nothing that would touch a real rate or item, should it go through.
		const refused = [
			await db.rpc('save_tax_rate', {
				p_taxrateid: null,
				p_taxratetype: 'GST',
				p_rate: 0.5,
				p_from: '2950-01-01',
				p_to: '2950-12-31'
			}),
			await db.rpc('remove_tax_rate', { p_taxrateid: -1 }),
			await db.rpc('save_inventory_item', {
				p_inventoryid: null,
				p_invcode: 'ZZ0',
				p_description: 'Refused',
				p_invtype: null,
				p_price: 1
			}),
			await db.rpc('save_item_type', { p_inventorytype: 'ZZ Refused', p_transactiontype: 'Misc.' }),
			await db.rpc('save_room', {
				p_roomid: null,
				p_roomname: 'ZZ Refused',
				p_roomnumber: null,
				p_roomtype: 'No Type',
				p_roomcode: null,
				p_roomshorthand: null,
				p_roomorder: 99999,
				p_roomnotes: null,
				p_gst: false,
				p_pst: false,
				p_room_tax: false,
				p_dmt: false,
				p_active: false
			}),
			await db.rpc('save_room_rate', {
				p_roomrateid: null,
				p_roomids: [],
				p_roomratetype: 'Regular',
				p_roomratecode: 'R01',
				p_rate: 1,
				p_from: '2950-01-01',
				p_to: '2950-12-31'
			}),
			await db.rpc('remove_room_rate', { p_roomrateid: -1 }),
			await db.rpc('save_rate_code', { p_roomratecode: 'ZZ0', p_description: 'Refused', p_new: true }),
			await db.rpc('add_room_type', { p_roomtype: 'ZZ Refused' })
		];
		for (const call of refused) {
			expect(call.error?.code).toBe('42501');
			expect(call.error?.message).toBe(
				'Only the admin login can change the tax rates and the price list.'
			);
		}

		// Straight to the tables: an update touches nothing, an insert is refused.
		// Each update writes the value the row already holds, so even a failure
		// here changes nothing.
		const tables = [
			['inventory_items', 'inventoryid', 'invamount'],
			['lookup_inventory_types', 'inventorytype', 'transactiontype'],
			['rooms', 'roomid', 'roomgst'],
			['room_rates', 'roomrateid', 'roomrate'],
			['lookup_room_rate_codes', 'roomratecode', 'roomratecodedescription'],
			['lookup_room_types', 'roomtype', 'roomtype'],
			['tax_rates', 'taxrateid', 'taxrate']
		] as const;
		for (const [table, id, column] of tables) {
			const [row] = unwrap(
				await db.from(table).select(`${id}, ${column}`).order(id).limit(1)
			) as Record<string, unknown>[];
			const changed = unwrap(
				await db
					.from(table)
					.update({ [column]: row[column] })
					.eq(id, row[id] as string)
					.select(id)
			);
			expect(changed, table).toEqual([]);
		}
		const inserted = await db.from('tax_rates').insert({
			taxratetype: 'GST',
			taxrate: 0.5,
			taxratestartdate: '2950-01-01',
			taxrateenddate: '2950-12-31',
			taxratearchive: false
		});
		expect(inserted.error?.code).toBe('42501');

		// …and still reads what the front desk charges with.
		const read = unwrap(
			await db.from('inventory_items').select('inventoryid').eq('invarchive', false).limit(1)
		);
		expect(read).toHaveLength(1);
		const gst = Number(unwrap(await db.rpc('effective_tax_rate', { p_taxratetype: 'GST', p_date: todayISO() })));
		expect(gst).toBeGreaterThan(0);
	});

	describe('as the admin login', () => {
		const page = useAppPage(undefined, 'admin');

		it('opens the admin area, with its own navigation bar, and a way to the front desk and back', async () => {
			expect(new URL(page.url()).pathname).toBe('/admin/sales');
			const nav = page.getByRole('navigation', { name: 'Admin' });
			expect(await nav.getByRole('link').allInnerTexts()).toEqual([
				'Sales Reports',
				'Item Prices',
				'Rooms & Rates',
				'Taxes',
				'Year End Deposits'
			]);
			expect(await page.locator('header button[title="Sign out"]').count()).toBe(1);

			await page.getByRole('link', { name: 'Front desk' }).click();
			await page.waitForURL(`${APP_URL}/`);
			await page.locator('header a[href="/admin"]', { hasText: 'Admin' }).click();
			await page.waitForURL(`${APP_URL}/admin/sales`);
		});
	});

	describe('as front-desk staff', () => {
		const page = useAppPage();

		it('has no Admin button, and is taken from any admin screen to the lookup', async () => {
			await page.locator('header button[title="Sign out"]').waitFor();
			expect(await page.locator('header a[href="/admin"]').count()).toBe(0);
			for (const path of [
				'/admin',
				'/admin/sales',
				'/admin/taxes',
				'/admin/item-prices',
				'/admin/rooms',
				'/admin/year-end-deposits'
			]) {
				await page.goto(APP_URL + path, { waitUntil: 'networkidle' });
				expect(new URL(page.url()).pathname, path).toBe('/');
			}
		});
	});
});
