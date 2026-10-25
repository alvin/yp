// Story: spec/features/post-room-night-and-extra-charges.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import {
	ledger,
	makeReservation,
	postCharge,
	postRoomNights,
	pricedItem,
	rpc,
	staffClient,
	todayISO,
	unwrap,
	type Fixture,
	type Item
} from '../helpers/db';
import type { Room } from '../../src/lib/data/types';

let fx: Fixture;
let item: Item;
let wine: { inventoryid: number; invcode: string; invamount: number };

beforeAll(async () => {
	fx = await makeReservation();
	item = await pricedItem();
	const db = await staffClient();
	[wine] = unwrap(
		await db
			.from('inventory_items')
			.select('inventoryid, invcode, invamount')
			.eq('invarchive', false)
			.eq('invtype', 'Red Wine')
			.gt('invamount', 0)
			.order('inventoryid')
			.limit(1)
	) as { inventoryid: number; invcode: string; invamount: number }[];
});

async function transtypeOf(transactionid: number): Promise<string> {
	const db = await staffClient();
	const [row] = unwrap(
		await db.from('transactions').select('transtype').eq('transactionid', transactionid)
	) as { transtype: string }[];
	return row.transtype;
}

const lineOf = async (id: number) =>
	(await ledger(fx.reservationid)).find((l) => l.line_source === 'transaction' && l.line_id === id);

describe('post room-night and extra charges', () => {
	it('adds room nights to the reservation, dated and counted', async () => {
		const id = await postRoomNights(fx, 150);
		const line = await lineOf(id);
		expect([line?.line_type, line?.line_date.slice(0, 10), Number(line?.quantity), Number(line?.amount)]).toEqual([
			'Room',
			fx.arrival,
			3,
			450
		]);
	});

	it('adds an extra charge to the reservation, dated and counted', async () => {
		const id = await postCharge(fx, { inventoryid: item.inventoryid, quantity: 2 });
		const line = await lineOf(id);
		expect([line?.code, line?.line_date.slice(0, 10), Number(line?.quantity), Number(line?.amount)]).toEqual([
			item.invcode,
			fx.arrival,
			2,
			Math.round(item.invamount * 2 * 100) / 100
		]);
	});

	it('posts an extra charge to its daily cash category through the posting function', async () => {
		const id = await postCharge(fx, { inventoryid: wine.inventoryid });
		expect(await transtypeOf(id)).toBe('Liquor');
	});

	it('includes every posted line in the reservation total', async () => {
		// Historical dates carry no tax, so the total is the lines alone.
		const expected = 450 + Math.round(item.invamount * 2 * 100) / 100 + Number(wine.invamount);
		expect(Number(await rpc('reservation_balance', { p_reservationid: fx.reservationid }))).toBeCloseTo(
			expected,
			2
		);
	});
});

describe('post room-night and extra charges — the room rate in the charge dialog', () => {
	const page = useAppPage();
	let stay: Fixture;
	// Two rooms that charge different rates today, so a change of room shows.
	let rooms: { room: Room; rate: number }[];

	async function pickRoom(room: Room): Promise<void> {
		await page.click('#c-room');
		await page.locator('[data-testid=combobox-list]').waitFor({ timeout: 10_000 });
		await page.keyboard.type(`${room.roomname} ${room.roomnumber ?? ''}`.trim());
		await page.locator('[data-testid=combobox-list] [role=option]').first().click();
	}

	function unitPrice(): Promise<number> {
		return page.inputValue('#c-unit').then(Number);
	}

	beforeAll(async () => {
		stay = await makeReservation();
		const client = await staffClient();
		const all = unwrap(
			await client.from('rooms').select('*').eq('roomarchive', false).order('roomorder')
		) as Room[];
		const priced: { room: Room; rate: number }[] = [];
		for (const room of all) {
			const rate = await rpc<number | null>('effective_room_rate', {
				p_roomid: room.roomid,
				p_date: todayISO()
			});
			if (rate != null && !priced.some((p) => p.rate === Number(rate)))
				priced.push({ room, rate: Number(rate) });
			if (priced.length === 2) break;
		}
		rooms = priced;

		await page.goto(`${APP_URL}/reservations/${stay.resnumber}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Charge', exact: true }).click();
		await page.locator('#c-room').waitFor({ timeout: 15_000 });
	});

	it("shows the chosen room's rate before the charge is posted", async () => {
		expect(rooms).toHaveLength(2);
		for (const { room, rate } of rooms) {
			await pickRoom(room);
			await expect.poll(unitPrice, { timeout: 10_000 }).toBeCloseTo(rate, 2);
		}
	});

	it('asks for no notes on a charge line', async () => {
		expect(await page.locator('#c-notes').count()).toBe(0);
		await expect(
			rpc('post_charge', {
				p_reservationguestid: stay.reservationguestid,
				p_inventoryid: 1,
				p_notes: 'x'
			})
		).rejects.toThrow(/Could not find the function ypl\.post_charge\(.*p_notes/);
	});

	it('starts on the Double rate and follows the rate chosen', async () => {
		const { room } = rooms[0];
		await pickRoom(room);
		// The rate table keeps Access's names: Regular is Double, Special is Single.
		const rate = (ratetype: string) =>
			rpc<number>('effective_room_rate', {
				p_roomid: room.roomid,
				p_date: todayISO(),
				p_ratetype: ratetype
			}).then(Number);
		const double = await rate('Regular');
		const single = await rate('Special');
		const split = await rate('Split');
		expect(new Set([double, single, split]).size).toBe(3);
		await expect.poll(unitPrice, { timeout: 10_000 }).toBeCloseTo(double, 2);
		expect((await page.textContent('#c-rate'))?.trim()).toBe('Double');

		const choose = async (label: string) => {
			await page.click('#c-rate');
			const options = page.locator('[data-testid=combobox-list] [role=option]');
			expect((await options.allTextContents()).map((o) => o.trim())).toEqual([
				'Double',
				'Single',
				'Split'
			]);
			await options.filter({ hasText: label }).click();
		};
		await choose('Single');
		await expect.poll(unitPrice, { timeout: 10_000 }).toBeCloseTo(single, 2);
		await choose('Split');
		await expect.poll(unitPrice, { timeout: 10_000 }).toBeCloseTo(split, 2);
	});

	it('posts the price the clerk types over the rate', async () => {
		await page.fill('#c-qty', '2');
		await page.fill('#c-unit', '99.50');
		await page.getByRole('button', { name: 'Add charge' }).click();
		await expect
			.poll(
				async () => {
					const lines = await rpc<{ line_source: string; amount: number }[]>(
						'reservation_ledger',
						{ p_reservationid: stay.reservationid }
					);
					return lines.filter((l) => l.line_source === 'transaction').map((l) => Number(l.amount));
				},
				{ timeout: 10_000 }
			)
			.toEqual([199]);
	});

	it('posts an extra charge added on screen to its daily cash category', async () => {
		await page.getByRole('button', { name: 'Charge', exact: true }).click();
		await page.getByRole('button', { name: 'Item / extra' }).click();
		await page.click('#c-item');
		await page.keyboard.type(wine.invcode);
		await page.locator('[data-testid=combobox-list] [role=option]').first().click();
		await page.getByRole('button', { name: 'Add charge' }).click();
		await expect
			.poll(
				async () =>
					(await ledger(stay.reservationid)).filter((l) => l.code === wine.invcode).map((l) => l.line_id),
				{ timeout: 10_000 }
			)
			.toHaveLength(1);
		const [line] = (await ledger(stay.reservationid)).filter((l) => l.code === wine.invcode);
		expect(await transtypeOf(line.line_id)).toBe('Liquor');
	});
});
