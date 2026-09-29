// Story: spec/features/post-room-night-and-extra-charges.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, rpc, staffClient, todayISO, unwrap, type Fixture } from '../helpers/db';
import type { Room } from '../../src/lib/data/types';

let fx: Fixture;
let roomid: number;
let invid: number;

beforeAll(async () => {
	fx = await makeReservation();
	roomid = (await rpc<{ roomid: number }[]>('room_directory'))[0].roomid;
	const client = await staffClient();
	invid = (
		unwrap(
			await client
				.from('inventory_items')
				.select('inventoryid')
				.eq('invarchive', false)
				.gt('invamount', 0)
				.limit(1)
		) as { inventoryid: number }[]
	)[0].inventoryid;
});

describe('post room-night and extra charges', () => {
	it('adds room-night charges for the reservation', async () => {
		const txid = await rpc<number>('post_room_nights', {
			p_reservationguestid: fx.reservationguestid,
			p_roomid: roomid,
			p_occupancyin: fx.arrival,
			p_occupancyout: fx.departure,
			p_rate: 150,
			p_transdate: fx.arrival
		});
		expect(txid).toBeGreaterThan(0);
	});

	it('adds extra charges for the reservation', async () => {
		const txid = await rpc<number>('post_charge', {
			p_reservationguestid: fx.reservationguestid,
			p_inventoryid: invid,
			p_quantity: 1,
			p_transdate: fx.arrival
		});
		expect(txid).toBeGreaterThan(0);
	});

	it('records each charge line with a date and quantity', async () => {
		const rows = await rpc<
			{ line_source: string; line_date: string; quantity: number }[]
		>('reservation_ledger', { p_reservationid: fx.reservationid });
		const charges = rows.filter((r) => r.line_source === 'transaction');
		expect(charges.length).toBeGreaterThanOrEqual(2);
		for (const c of charges) {
			expect(c.line_date).toBe(fx.arrival);
			expect(Number(c.quantity)).toBeGreaterThan(0);
		}
	});

	it('posts an extra charge to its daily cash category without being told it', async () => {
		const client = await staffClient();
		const [wine] = unwrap(
			await client
				.from('inventory_items')
				.select('inventoryid')
				.eq('invarchive', false)
				.eq('invtype', 'Red Wine')
				.limit(1)
		) as { inventoryid: number }[];
		const txid = await rpc<number>('post_charge', {
			p_reservationguestid: fx.reservationguestid,
			p_inventoryid: wine.inventoryid,
			p_quantity: 1,
			p_transdate: fx.arrival
		});
		const [line] = unwrap(
			await client.from('transactions').select('transtype').eq('transactionid', txid)
		) as { transtype: string }[];
		expect(line.transtype).toBe('Liquor');
	});

	it('updates the reservation total to include posted lines', async () => {
		const balance = await rpc<number>('reservation_balance', { p_reservationid: fx.reservationid });
		expect(Number(balance)).toBeGreaterThan(0);
	});
});

describe('post room-night and extra charges — the room rate in the charge dialog', () => {
	let page: Page;
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

		page = await openAppPage();
		await page.goto(`${APP_URL}/reservations/${stay.resnumber}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Charge', exact: true }).click();
		await page.locator('#c-room').waitFor({ timeout: 15_000 });
	});

	afterAll(async () => {
		await closeApp(page);
	});

	it("shows the chosen room's rate before the charge is posted", async () => {
		expect(rooms).toHaveLength(2);
		for (const { room, rate } of rooms) {
			await pickRoom(room);
			await expect.poll(unitPrice, { timeout: 10_000 }).toBeCloseTo(rate, 2);
		}
	});

	it('starts on the Regular rate and follows the rate chosen', async () => {
		const { room } = rooms[0];
		await pickRoom(room);
		const rate = (ratetype: string) =>
			rpc<number>('effective_room_rate', {
				p_roomid: room.roomid,
				p_date: todayISO(),
				p_ratetype: ratetype
			}).then(Number);
		const regular = await rate('Regular');
		const split = await rate('Split');
		expect(split).not.toBe(regular);
		await expect.poll(unitPrice, { timeout: 10_000 }).toBeCloseTo(regular, 2);

		await page.click('#c-rate');
		await page.locator('[data-testid=combobox-list] [role=option]', { hasText: 'Split' }).click();
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
});
