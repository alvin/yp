// Story: spec/features/set-the-tax-rates.feature
//
// A rate set for today would reach every other test charging today, so the
// rates these tests add run in the year 2950, where nothing else is charged
// (global setup clears them).

import { describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, printedDate, useAppPage } from '../helpers/app';
import { adminClient, adminRpc, makeReservation, rpc, staffClient, todayISO, unwrap } from '../helpers/db';

interface Rate {
	taxrateid: number;
	taxratetype: string;
	taxrate: number;
	taxratestartdate: string;
	taxrateenddate: string;
	taxratearchive: boolean;
}

const rate = (type: string, date: string) =>
	rpc<number>('effective_tax_rate', { p_taxratetype: type, p_date: date }).then(Number);

async function ratesOf(type: string, onOrAfter = '2900-01-01'): Promise<Rate[]> {
	const db = await staffClient();
	return unwrap(
		await db
			.from('tax_rates')
			.select('*')
			.eq('taxratetype', type)
			.eq('taxratearchive', false)
			.gte('taxratestartdate', onOrAfter)
			.order('taxratestartdate')
	) as Rate[];
}

const save = (args: { id?: number; type: string; rate: number; from: string; to: string }) =>
	adminRpc<number>('save_tax_rate', {
		p_taxrateid: args.id ?? null,
		p_taxratetype: args.type,
		p_rate: args.rate,
		p_from: args.from,
		p_to: args.to
	});

describe('set the tax rates', () => {
	it('adds a rate ahead of time, ending the one running when it starts', async () => {
		const first = await save({ type: 'PST', rate: 0.08, from: '2950-01-01', to: '2950-12-31' });
		expect(await rate('PST', '2950-01-01')).toBe(0.08);
		expect(await rate('PST', '2949-12-31')).toBe(0);

		await save({ type: 'PST', rate: 0.09, from: '2950-06-01', to: '2950-12-31' });
		expect(await rate('PST', '2950-05-31')).toBe(0.08);
		expect(await rate('PST', '2950-06-01')).toBe(0.09);
		const rows = await ratesOf('PST');
		expect(rows.map((r) => [r.taxrateid === first, r.taxratestartdate.slice(0, 10), r.taxrateenddate.slice(0, 10)])).toEqual([
			[true, '2950-01-01', '2950-05-31'],
			[false, '2950-06-01', '2950-12-31']
		]);
	});

	it('refuses two rates of a tax on the same day, naming the one in the way', async () => {
		const db = await adminClient();
		const overlap = await db.rpc('save_tax_rate', {
			p_taxrateid: null,
			p_taxratetype: 'PST',
			p_rate: 0.1,
			p_from: '2950-03-01',
			p_to: '2950-03-31'
		});
		expect(overlap.error?.message).toBe('PST is already 8% from 01-Jan-50 to 31-May-50.');

		// However the row is written: an edit, or straight to the table.
		const [first] = await ratesOf('PST');
		const edit = await db.rpc('save_tax_rate', {
			p_taxrateid: first.taxrateid,
			p_taxratetype: 'PST',
			p_rate: 0.08,
			p_from: '2950-01-01',
			p_to: '2950-07-31'
		});
		expect(edit.error?.message).toBe('PST is already 9% from 01-Jun-50 to 31-Dec-50.');
		const direct = await db.from('tax_rates').update({ taxrateenddate: '2950-06-15' }).eq('taxrateid', first.taxrateid);
		expect(direct.error?.message).toBe('PST is already 9% from 01-Jun-50 to 31-Dec-50.');
	});

	it('refuses a rate outside 0% to under 100%, or one ending before it starts', async () => {
		const db = await adminClient();
		for (const bad of [1, 1.5, -0.01]) {
			const call = await db.rpc('save_tax_rate', {
				p_taxrateid: null,
				p_taxratetype: 'GST',
				p_rate: bad,
				p_from: '2951-01-01',
				p_to: '2951-12-31'
			});
			expect(call.error?.message, String(bad)).toBe('A tax rate is from 0% to under 100%.');
		}
		const backwards = await db.rpc('save_tax_rate', {
			p_taxrateid: null,
			p_taxratetype: 'GST',
			p_rate: 0.05,
			p_from: '2951-12-31',
			p_to: '2951-01-01'
		});
		expect(backwards.error?.message).toBe('A rate ends on or after the day it starts.');
	});

	it('taxes a charge at the rate of its own date', async () => {
		const fx = await makeReservation();
		const db = await staffClient();
		const [item] = unwrap(
			await db
				.from('inventory_items')
				.select('inventoryid')
				.eq('invarchive', false)
				.eq('invpst', true)
				.order('inventoryid')
				.limit(1)
		) as { inventoryid: number }[];
		const post = (transdate: string) =>
			rpc<number>('post_charge', {
				p_reservationguestid: fx.reservationguestid,
				p_inventoryid: item.inventoryid,
				p_quantity: 1,
				p_transdate: transdate,
				p_amount: 100
			});
		const lines = [await post('2950-05-31'), await post('2950-06-01')];
		const taxed = unwrap(
			await db.from('transactions').select('transactionid, transpstamount').in('transactionid', lines)
		) as { transactionid: number; transpstamount: number }[];
		const pstOn = (id: number) => Number(taxed.find((t) => t.transactionid === id)!.transpstamount);
		expect([pstOn(lines[0]), pstOn(lines[1])]).toEqual([8, 9]);
	});

	it('removes a rate until the day it starts, and the rate it ended runs on again', async () => {
		const db = await adminClient();
		const [inForce] = unwrap(
			await db.rpc('tax_rate_in_force', { p_taxratetype: 'PST', p_date: todayISO() })
		) as Rate[];
		const started = await db.rpc('remove_tax_rate', { p_taxrateid: inForce.taxrateid });
		expect(started.error?.message).toBe("A rate that started before today can't be removed.");

		const [first, second] = await ratesOf('PST');
		await adminRpc('remove_tax_rate', { p_taxrateid: second.taxrateid });
		expect(await rate('PST', '2950-06-01')).toBe(0.08);
		const left = await ratesOf('PST');
		expect(left.map((r) => [r.taxrateid, r.taxrateenddate.slice(0, 10)])).toEqual([
			[first.taxrateid, '2950-12-31']
		]);
	});

	describe('on screen', () => {
		const page = useAppPage('/admin/taxes', 'admin');

		const rowOf = (p: Page, text: string) => p.locator('tbody tr', { hasText: text });

		it('lists every rate of the five taxes, newest first under each, the rate in force marked', async () => {
			const db = await staffClient();
			const all = unwrap(
				await db
					.from('tax_rates')
					.select('taxratetype, taxrate, taxratestartdate, taxrateenddate')
					.eq('taxratearchive', false)
					.order('taxratestartdate', { ascending: false })
			) as Omit<Rate, 'taxrateid' | 'taxratearchive'>[];
			const names: [string, string][] = [
				['GST', 'GST'],
				['PST', 'PST'],
				['Liquor', 'Liquor Tax'],
				['Room', 'Room Tax'],
				['DMT', 'Destination Marketing Tax']
			];
			const today = todayISO();
			const expected = names.flatMap(([type, name]) =>
				all
					.filter((r) => r.taxratetype === type)
					.map((r, i) => {
						const from = r.taxratestartdate.slice(0, 10);
						const to = r.taxrateenddate.slice(0, 10);
						const mark = from > today ? 'Upcoming' : to < today ? '' : 'Current';
						const pct = `${Math.round(Number(r.taxrate) * 100 * 10_000) / 10_000}%`;
						return [i === 0 ? name : '', pct, printedDate(from), printedDate(to), mark];
					})
			);
			await page.locator('tbody tr').first().waitFor();
			const shown = await Promise.all(
				(await page.locator('tbody tr').all()).map(async (row) =>
					(await row.locator('td').allInnerTexts()).slice(0, 5).map((t) => t.trim())
				)
			);
			expect(shown).toEqual(expected);
		});

		it('adds a rate in the drawer, saying which rate it ends, then changes and removes it', async () => {
			await page.locator('main').getByRole('button', { name: 'Add rate' }).click();
			await page.locator('#tax-type').click();
			await page.locator('[data-slot="combobox-content"] [data-option="Room"]').click();
			await page.fill('#tax-rate', '5');
			await page.fill('#tax-from', '2952-01-01');
			await page.fill('#tax-to', '2952-12-31');
			await page.fill('#tax-notes', 'Set by the province');
			await page.getByRole('dialog').getByRole('button', { name: 'Add rate' }).click();
			await page.getByText('Added Room Tax at 5%').waitFor();
			const db = await staffClient();
			const [entered] = unwrap(
				await db
					.from('tax_rates')
					.select('taxratenotes')
					.eq('taxratetype', 'Room')
					.eq('taxratestartdate', '2952-01-01')
			) as { taxratenotes: string }[];
			expect(entered.taxratenotes).toBe('Set by the province');
			await rowOf(page, '01-Jan-52').waitFor();
			expect(await rowOf(page, '01-Jan-52').innerText()).toContain('Upcoming');

			// A second, starting while the first runs: the drawer says it ends.
			await page.locator('main').getByRole('button', { name: 'Add rate' }).click();
			await page.locator('#tax-type').click();
			await page.locator('[data-slot="combobox-content"] [data-option="Room"]').click();
			await page.fill('#tax-rate', '6');
			await page.fill('#tax-from', '2952-07-01');
			await page.fill('#tax-to', '2952-12-31');
			await page.getByText('The 5% rate from 01-Jan-52 ends on 30-Jun-52.').waitFor();
			await page.getByRole('dialog').getByRole('button', { name: 'Add rate' }).click();
			await page.getByText('Added Room Tax at 6%').waitFor();
			await expect.poll(() => rowOf(page, '01-Jan-52').innerText()).toContain('30-Jun-52');

			await rowOf(page, '01-Jul-52').click();
			expect(await page.getByRole('dialog').getByRole('heading').innerText()).toBe('Room Tax rate');
			await page.fill('#tax-rate', '6.5');
			await page.getByRole('button', { name: 'Save rate' }).click();
			await page.getByText('Saved Room Tax at 6.5%').waitFor();
			expect(await rate('Room', '2952-07-01')).toBe(0.065);

			// Removed after confirming: the rate it ended runs on again.
			await rowOf(page, '01-Jul-52').click();
			await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click();
			const confirm = page.getByRole('dialog', { name: 'Remove this rate?' });
			await confirm.getByText('The 5% rate from 01-Jan-52 runs on to 31-Dec-52.').waitFor();
			await confirm.getByRole('button', { name: 'Remove rate' }).click();
			await page.getByText('Removed Room Tax at 6.5%').waitFor();
			await expect.poll(() => rowOf(page, '01-Jul-52').count()).toBe(0);
			await expect.poll(() => rowOf(page, '01-Jan-52').innerText()).toContain('31-Dec-52');
		});

		it('shows the database’s reason when it refuses a rate, and keeps the drawer open', async () => {
			await page.locator('main').getByRole('button', { name: 'Add rate' }).click();
			await page.locator('#tax-type').click();
			await page.locator('[data-slot="combobox-content"] [data-option="Room"]').click();
			await page.fill('#tax-rate', '7');
			await page.fill('#tax-from', '2952-03-01');
			await page.fill('#tax-to', '2952-03-31');
			await page.getByRole('dialog').getByRole('button', { name: 'Add rate' }).click();
			await page.getByText('Room Tax is already 5% from 01-Jan-52 to 31-Dec-52.').waitFor();
			expect(await page.getByRole('dialog').count()).toBe(1);
			await page.keyboard.press('Escape');
		});
	});
});
