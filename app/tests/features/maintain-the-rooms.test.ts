// Story: spec/features/maintain-the-rooms.feature
//
// Rooms, rate codes and room types the tests add are named ZZ…; the rooms are
// kept disabled, out of the front desk's lists, except while the screen adds
// one. Rates the tests put on the lodge's own rooms run in the year 2950 or
// later, where nothing else is charged. Global setup clears all of it.

import { describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { useAppPage } from '../helpers/app';
import {
	addDays,
	adminClient,
	adminRpc,
	makeReservation,
	roomDirectory,
	rpc,
	staffClient,
	todayISO,
	unwrap
} from '../helpers/db';

interface RoomRow {
	roomid: number;
	roomname: string;
	roomnumber: string | null;
	roomtype: string;
	roomcode: string | null;
	roomshorthand: string | null;
	roomorder: number;
	roomnotes: string | null;
	roomgst: boolean;
	roompst: boolean;
	roomrt: boolean;
	roomdmt: boolean;
	roomarchive: boolean;
}

interface RateRow {
	roomrateid: number;
	roomid: number;
	roomratetype: string;
	roomratecode: string;
	roomrate: number;
	roomratestartdate: string;
	roomrateenddate: string;
	roomratearchive: boolean;
}

const tag = () => Math.random().toString(36).slice(2, 6).toUpperCase();
const order = () => 9000 + Math.round(Math.random() * 99_000) / 100;

async function room(id: number): Promise<RoomRow> {
	const db = await staffClient();
	const [row] = unwrap(await db.from('rooms').select('*').eq('roomid', id)) as RoomRow[];
	return { ...row, roomorder: Number(row.roomorder) };
}

async function ratesOf(roomid: number): Promise<RateRow[]> {
	const db = await staffClient();
	return unwrap(
		await db
			.from('room_rates')
			.select('*')
			.eq('roomid', roomid)
			.eq('roomratearchive', false)
			.order('roomratestartdate')
	) as RateRow[];
}

const rate = (roomid: number, date: string, type = 'Regular') =>
	rpc<number | null>('effective_room_rate', { p_roomid: roomid, p_date: date, p_ratetype: type }).then(
		(r) => (r == null ? null : Number(r))
	);

/** A disabled test room of a new type, with a new rate code; its id and names. */
async function testRoom() {
	const type = `ZZ Yurt ${tag()}`;
	const code = `ZZ${tag().slice(0, 3)}`;
	const name = `ZZ Cabin ${tag()}`;
	await adminRpc('add_room_type', { p_roomtype: type });
	await adminRpc('save_rate_code', { p_roomratecode: code, p_description: 'Test cabin', p_new: true });
	const roomid = await adminRpc<number>('save_room', {
		p_roomid: null,
		p_roomname: name,
		p_roomnumber: '01',
		p_roomtype: type,
		p_roomcode: 'zz1',
		p_roomshorthand: 'Q+DH',
		p_roomorder: order(),
		p_roomnotes: 'Test notes',
		p_gst: true,
		p_pst: false,
		p_room_tax: true,
		p_dmt: true,
		p_active: false
	});
	return { roomid, type, code, name, label: `${name} 01` };
}

const saveRate = (args: Record<string, unknown>) =>
	adminRpc('save_room_rate', { p_roomrateid: null, p_notes: null, ...args });

describe('maintain the rooms', () => {
	it('adds a room as Access kept it, refusing a second of one name and number, or of one sort order', async () => {
		const t = await testRoom();
		const added = await room(t.roomid);
		expect(added).toMatchObject({
			roomname: t.name,
			roomnumber: '01',
			roomtype: t.type,
			roomcode: 'zz1',
			roomshorthand: 'Q+DH',
			roomnotes: 'Test notes',
			roomgst: true,
			roompst: false,
			roomrt: true,
			roomdmt: true,
			roomarchive: true
		});

		const db = await adminClient();
		const again = await db.rpc('save_room', {
			p_roomid: null,
			p_roomname: t.name.toLowerCase(),
			p_roomnumber: '01',
			p_roomtype: t.type,
			p_roomcode: null,
			p_roomshorthand: null,
			p_roomorder: order(),
			p_roomnotes: null,
			p_gst: true,
			p_pst: false,
			p_room_tax: true,
			p_dmt: true,
			p_active: false
		});
		expect(again.error?.message).toBe(`There is already a room ${t.label}.`);
		const sameOrder = await db.rpc('save_room', {
			p_roomid: null,
			p_roomname: t.name,
			p_roomnumber: '02',
			p_roomtype: t.type,
			p_roomcode: null,
			p_roomshorthand: null,
			p_roomorder: added.roomorder,
			p_roomnotes: null,
			p_gst: true,
			p_pst: false,
			p_room_tax: true,
			p_dmt: true,
			p_active: false
		});
		expect(sameOrder.error?.message).toBe(`${t.label} already sorts at ${added.roomorder}.`);

		// Disabled, it is out of the front desk's room lists.
		const directory = await rpc<{ roomid: number }[]>('room_directory');
		expect(directory.map((r) => r.roomid)).not.toContain(t.roomid);
	});

	it('gives a room its rates from any day, ending the one running when it starts, and never two on one day', async () => {
		const t = await testRoom();
		await saveRate({
			p_roomids: [t.roomid],
			p_roomratetype: 'Regular',
			p_roomratecode: t.code,
			p_rate: 300,
			p_from: '2950-01-01',
			p_to: '2950-12-31'
		});
		await saveRate({
			p_roomids: [t.roomid],
			p_roomratetype: 'Regular',
			p_roomratecode: t.code,
			p_rate: 320,
			p_from: '2950-07-01',
			p_to: '2950-12-31'
		});
		expect([await rate(t.roomid, '2950-06-30'), await rate(t.roomid, '2950-07-01')]).toEqual([300, 320]);
		const rows = await ratesOf(t.roomid);
		expect(rows.map((r) => [Number(r.roomrate), r.roomratestartdate.slice(0, 10), r.roomrateenddate.slice(0, 10)])).toEqual([
			[300, '2950-01-01', '2950-06-30'],
			[320, '2950-07-01', '2950-12-31']
		]);

		const db = await adminClient();
		const overlap = await db.rpc('save_room_rate', {
			p_roomrateid: null,
			p_roomids: [t.roomid],
			p_roomratetype: 'Regular',
			p_roomratecode: t.code,
			p_rate: 999,
			p_from: '2950-03-01',
			p_to: '2950-03-31'
		});
		expect(overlap.error?.message).toBe(
			`${t.label} already has a Double rate of $300.00 from 01-Jan-50 to 30-Jun-50.`
		);

		// A rate is changed where it stands.
		await saveRate({
			p_roomrateid: rows[1].roomrateid,
			p_roomids: [],
			p_roomratetype: 'Regular',
			p_roomratecode: t.code,
			p_rate: 325,
			p_from: '2950-07-01',
			p_to: '2950-12-31',
			p_notes: 'Summer'
		});
		expect(await rate(t.roomid, '2950-07-01')).toBe(325);
	});

	it('removes a rate until the day it starts, and the rate it ended runs on again', async () => {
		const t = await testRoom();
		await saveRate({
			p_roomids: [t.roomid],
			p_roomratetype: 'Special',
			p_roomratecode: t.code,
			p_rate: 150,
			p_from: todayISO(),
			p_to: '2950-12-31'
		});
		await saveRate({
			p_roomids: [t.roomid],
			p_roomratetype: 'Special',
			p_roomratecode: t.code,
			p_rate: 175,
			p_from: '2950-07-01',
			p_to: '2950-12-31'
		});
		const [first, second] = await ratesOf(t.roomid);
		expect(first.roomrateenddate.slice(0, 10)).toBe('2950-06-30');

		await adminRpc('remove_room_rate', { p_roomrateid: second.roomrateid });
		const [back] = await ratesOf(t.roomid);
		expect([back.roomrateid, back.roomrateenddate.slice(0, 10)]).toEqual([first.roomrateid, '2950-12-31']);
		expect(await rate(t.roomid, '2950-07-01', 'Special')).toBe(150);

		// One starting today goes too; one that started before today can't.
		await adminRpc('remove_room_rate', { p_roomrateid: first.roomrateid });
		expect(await ratesOf(t.roomid)).toEqual([]);
		const [lodge] = await roomDirectory();
		const [running] = unwrap(
			await (await staffClient()).rpc('room_rate_in_force', {
				p_roomid: lodge.roomid,
				p_date: todayISO(),
				p_ratetype: 'Regular'
			})
		) as RateRow[];
		const refused = await (await adminClient()).rpc('remove_room_rate', { p_roomrateid: running.roomrateid });
		expect(refused.error?.message).toBe("A rate that started before today can't be removed.");
	});

	it('puts one new rate on several rooms at once', async () => {
		const [a, b] = await roomDirectory();
		await saveRate({
			p_roomids: [a.roomid, b.roomid],
			p_roomratetype: 'Regular',
			p_roomratecode: 'R04',
			p_rate: 400,
			p_from: '2950-01-01',
			p_to: '2950-12-31'
		});
		for (const r of [a, b]) {
			expect(await rate(r.roomid, '2950-01-01')).toBe(400);
			expect(await rate(r.roomid, todayISO())).not.toBe(400);
		}
	});

	it('taxes a room’s nights by its own taxes', async () => {
		const t = await testRoom();
		const gst = Number(await rpc('effective_tax_rate', { p_taxratetype: 'GST', p_date: todayISO() }));
		expect(gst).toBeGreaterThan(0);
		await saveRate({
			p_roomids: [t.roomid],
			p_roomratetype: 'Regular',
			p_roomratecode: t.code,
			p_rate: 100,
			p_from: todayISO(),
			p_to: addDays(todayISO(), 30)
		});
		const fx = await makeReservation({ roomid: null });
		const post = () =>
			rpc<number>('post_room_nights', {
				p_reservationguestid: fx.reservationguestid,
				p_roomid: t.roomid,
				p_occupancyin: fx.arrival,
				p_occupancyout: addDays(fx.arrival, 1),
				p_transdate: todayISO()
			});
		const withGst = await post();
		const r = await room(t.roomid);
		await adminRpc('save_room', {
			p_roomid: t.roomid,
			p_roomname: r.roomname,
			p_roomnumber: r.roomnumber,
			p_roomtype: r.roomtype,
			p_roomcode: r.roomcode,
			p_roomshorthand: r.roomshorthand,
			p_roomorder: r.roomorder,
			p_roomnotes: r.roomnotes,
			p_gst: false,
			p_pst: false,
			p_room_tax: true,
			p_dmt: true
		});
		const withoutGst = await post();
		const db = await staffClient();
		const lines = unwrap(
			await db.from('transactions').select('transactionid, transamount, transgstamount').in('transactionid', [withGst, withoutGst])
		) as { transactionid: number; transamount: number; transgstamount: number }[];
		const gstOn = (id: number) => Number(lines.find((l) => l.transactionid === id)!.transgstamount);
		expect([gstOn(withGst), gstOn(withoutGst)]).toEqual([Math.round(100 * gst * 100) / 100, 0]);
	});

	it('keeps the rate codes and room types, as Access’s lookup tables did', async () => {
		const code = `ZZ${tag().slice(0, 3)}`;
		await adminRpc('save_rate_code', { p_roomratecode: code, p_description: 'Night for Two - Yurt', p_new: true });
		const db = await adminClient();
		const again = await db.rpc('save_rate_code', {
			p_roomratecode: code.toLowerCase(),
			p_description: 'Again',
			p_new: true
		});
		expect(again.error?.message).toBe(`${code.toLowerCase()} is already a rate code.`);
		await adminRpc('save_rate_code', { p_roomratecode: code, p_description: 'Night for Two - Big Yurt', p_new: false });
		const codes = await rpc<{ roomratecode: string; description: string; rooms: number }[]>('rate_codes');
		expect(codes.find((c) => c.roomratecode === code)).toEqual({
			roomratecode: code,
			description: 'Night for Two - Big Yurt',
			rooms: 0
		});
		const r01 = codes.find((c) => c.roomratecode === 'R01')!;
		expect(r01.rooms).toBe(12);

		const type = `ZZ Dome ${tag()}`;
		await adminRpc('add_room_type', { p_roomtype: type });
		const dup = await db.rpc('add_room_type', { p_roomtype: ` ${type.toUpperCase()} ` });
		expect(dup.error?.message).toBe(`${type.toUpperCase()} is already a room type.`);
		const types = await rpc<{ roomtype: string; rooms: number }[]>('room_types');
		expect(types.find((t) => t.roomtype === type)).toEqual({ roomtype: type, rooms: 0 });
		expect(types.find((t) => t.roomtype === 'Lodge Room')?.rooms).toBe(9);
	});

	describe('on screen', () => {
		const page = useAppPage('/admin/rooms', 'admin');

		const table = (p: Page, name: string) => p.locator(`table[aria-label="${name}"]`);
		const roomRow = (p: Page, label: string) =>
			table(p, 'Rooms').locator('tbody tr', { has: p.locator('td:first-child', { hasText: new RegExp(`^${label}$`) }) });
		const drawer = (p: Page) => p.getByRole('dialog').last();
		const choose = async (p: Page, id: string, search: string, value: string) => {
			await p.locator(id).click();
			await p.locator('[data-slot="combobox-content"] input').fill(search);
			await p.locator(`[data-slot="combobox-content"] [data-option="${value}"]`).click();
		};

		it('lists the active rooms in sort order, with the rates each is charged today', async () => {
			await table(page, 'Rooms').locator('tbody tr').first().waitFor();
			const db = await staffClient();
			const active = unwrap(
				await db.from('rooms').select('roomid, roomname, roomnumber').eq('roomarchive', false).order('roomorder')
			) as { roomid: number; roomname: string; roomnumber: string | null }[];
			const names = active
				.map((r) => r.roomname + (r.roomnumber ? ` ${r.roomnumber}` : ''))
				.filter((n) => !n.startsWith('ZZ'));
			const shown = (await table(page, 'Rooms').locator('tbody tr td:first-child').allInnerTexts()).filter(
				(n) => !n.startsWith('ZZ')
			);
			expect(shown).toEqual(names);

			const lodge = active[0];
			const cells = await roomRow(page, names[0]).locator('td').allInnerTexts();
			for (const [i, type] of ['Regular', 'Special', 'Split'].entries()) {
				const now = await rate(lodge.roomid, todayISO(), type);
				expect(cells[3 + i]).toBe(`$${now!.toFixed(2)}`);
			}
		});

		it('opens a room with its details, taxes and its own rates', async () => {
			const [first] = await roomDirectory();
			const r = await room(first.roomid);
			await roomRow(page, first.room_compact).click();
			expect(await drawer(page).getByRole('heading').first().innerText()).toBe(first.room_compact);
			expect(await page.inputValue('#room-name')).toBe(r.roomname);
			expect(await page.inputValue('#room-number')).toBe(r.roomnumber ?? '');
			expect(await page.locator('#room-type').innerText()).toBe(r.roomtype.trim());
			expect(Number(await page.inputValue('#room-order'))).toBe(r.roomorder);
			expect(await page.inputValue('#room-code')).toBe(r.roomcode ?? '');
			expect(await page.inputValue('#room-shorthand')).toBe(r.roomshorthand ?? '');
			expect(await drawer(page).getByLabel('GST').isChecked()).toBe(r.roomgst);
			expect(await drawer(page).getByLabel('DMT').isChecked()).toBe(r.roomdmt);
			const history = await ratesOf(first.roomid);
			await expect.poll(() => table(page, 'Rates').locator('tbody tr').count()).toBe(history.length);
			await page.keyboard.press('Escape');
		});

		it('adds a room, gives it its first rates, removes one, and disables the room', async () => {
			const t = tag();
			const name = `ZZ Lodge ${t}`;
			const sort = order();
			await page.locator('main').getByRole('button', { name: 'Add room', exact: true }).click();
			await page.fill('#room-name', name);
			await page.fill('#room-number', '07');
			await choose(page, '#room-type', 'private', 'Private Cabin');
			await page.fill('#room-order', String(sort));
			await page.fill('#room-code', 'zzz');
			await page.fill('#room-shorthand', 'K/2s');
			await drawer(page).getByLabel('GST').check();
			await drawer(page).getByLabel('Room Tax').check();
			await drawer(page).getByRole('button', { name: 'Add room' }).click();
			await page.getByText(`Added ${name} 07`).waitFor();
			// The drawer stays on the new room, for its first rates.
			await drawer(page).getByText('No rates.').waitFor();
			const db = await staffClient();
			const [added] = unwrap(await db.from('rooms').select('*').eq('roomname', name)) as RoomRow[];
			expect(added).toMatchObject({
				roomnumber: '07',
				roomtype: 'Private Cabin',
				roomcode: 'zzz',
				roomshorthand: 'K/2s',
				roomgst: true,
				roompst: false,
				roomrt: true,
				roomdmt: false,
				roomarchive: false
			});

			await drawer(page).getByRole('button', { name: 'Add rate' }).click();
			await choose(page, '#rate-code', 'R01', 'R01');
			await page.fill('#rate-price', '300');
			await page.fill('#rate-from', '2951-01-01');
			await page.fill('#rate-to', '2951-12-31');
			await drawer(page).getByRole('button', { name: 'Add rate' }).click();
			await page.getByText(`Added a Double rate to ${name} 07`).waitFor();

			// A second, from July: the drawer says the first ends.
			await drawer(page).getByRole('button', { name: 'Add rate' }).click();
			expect(await page.locator('#rate-code').innerText()).toContain('R01');
			await page.fill('#rate-price', '320');
			await page.fill('#rate-from', '2951-07-01');
			await page.fill('#rate-to', '2951-12-31');
			await drawer(page).getByText('The $300.00 Double rate from 01-Jan-51 ends on 30-Jun-51.').waitFor();
			await drawer(page).getByRole('button', { name: 'Add rate' }).click();
			await page.getByText(`Added a Double rate to ${name} 07`).last().waitFor();
			const rates = table(page, 'Rates').locator('tbody tr');
			await expect.poll(() => rates.count()).toBe(2);
			expect(await rates.first().innerText()).toContain('Upcoming');

			// Removed after confirming: the first runs on again.
			await table(page, 'Rates').locator('tbody tr', { hasText: '01-Jul-51' }).click();
			await drawer(page).getByRole('button', { name: 'Remove' }).click();
			const confirm = page.getByRole('dialog', { name: 'Remove this rate?' });
			await confirm.getByText('The $300.00 rate from 01-Jan-51 runs on to 31-Dec-51.').waitFor();
			await confirm.getByRole('button', { name: 'Remove rate' }).click();
			await page.getByText(`Removed the Double rate for ${name} 07`).waitFor();
			await expect.poll(() => rates.count()).toBe(1);
			expect(await rates.first().innerText()).toContain('31-Dec-51');

			await drawer(page).getByRole('button', { name: 'Disable room' }).click();
			await page.getByText(`Disabled ${name} 07`).waitFor();
			await expect.poll(() => roomRow(page, `${name} 07`).count()).toBe(0);
			await page.getByLabel('Show disabled').check();
			expect(await roomRow(page, `${name} 07`).innerText()).toContain('Disabled');
			await page.getByLabel('Show disabled').uncheck();
		});

		it('puts one rate on several rooms, ticked from a rate code and named in the drawer', async () => {
			await page.locator('main').getByRole('button', { name: 'Add rate', exact: true }).click();
			await choose(page, '#rate-code', 'R05', 'R05');
			expect(await page.locator('#rate-type').innerText()).toBe('Double');
			expect(await page.locator('#rate-rooms').innerText()).toBe('3 rooms');
			expect(await page.getByTestId('rate-rooms-chosen').innerText()).toBe(
				'Three Oaks 01, Three Oaks 02, Three Oaks 03'
			);
			// The rooms' running rate ends the day before a new one from 2028.
			await page.fill('#rate-from', '2028-01-01');
			await drawer(page).getByText('The running Double rate of 3 rooms ends on 31-Dec-27.').waitFor();

			// One more room, by name, and the rate goes on all four.
			await choose(page, '#rate-rooms', 'Parsonage 01', String((await roomDirectory()).find((r) => r.room_compact === 'Parsonage 01')!.roomid));
			await page.keyboard.press('Escape');
			expect(await page.locator('#rate-rooms').innerText()).toBe('4 rooms');
			await page.fill('#rate-price', '330');
			await page.fill('#rate-from', '2952-01-01');
			await page.fill('#rate-to', '2952-12-31');
			await drawer(page).getByRole('button', { name: 'Add rate' }).click();
			await page.getByText('Added a Double rate to 4 rooms').waitFor();
			const db = await staffClient();
			const added = unwrap(
				await db.from('room_rates').select('roomid').eq('roomratecode', 'R05').eq('roomratestartdate', '2952-01-01')
			) as { roomid: number }[];
			expect(added).toHaveLength(4);
		});

		it('adds a rate code and changes its description, and adds a room type', async () => {
			const code = `ZZ${tag().slice(0, 3)}`;
			await page.getByRole('tab', { name: 'Rate codes' }).click();
			await page.locator('main').getByRole('button', { name: 'Add rate code' }).click();
			await page.fill('#code-code', code);
			await page.fill('#code-description', 'Night for Two - Yurt');
			await drawer(page).getByRole('button', { name: 'Add rate code' }).click();
			await page.getByText(`Added ${code}`).waitFor();
			const row = table(page, 'Rate codes').locator('tbody tr', { hasText: code });
			await row.click();
			await page.fill('#code-description', 'Night for Two - Big Yurt');
			await drawer(page).getByRole('button', { name: 'Save rate code' }).click();
			await page.getByText(`Saved ${code}`).waitFor();
			await expect.poll(() => row.innerText()).toContain('Night for Two - Big Yurt');

			const type = `ZZ Dome ${tag()}`;
			await page.getByRole('tab', { name: 'Room types' }).click();
			await page.locator('main').getByRole('button', { name: 'Add room type' }).click();
			await page.fill('#room-type-name', type);
			await drawer(page).getByRole('button', { name: 'Add room type' }).click();
			await page.getByText(`Added ${type}`).waitFor();
			const typeRow = table(page, 'Room types').locator('tbody tr', { hasText: type });
			await typeRow.waitFor();
			expect((await typeRow.locator('td').allInnerTexts()).map((t) => t.trim())).toEqual([type, '0']);
			expect(new URL(page.url()).searchParams.get('tab')).toBe('types');
		});
	});
});
