// Story: spec/features/price-charges-from-the-lodge-price-lists.feature

import { beforeAll, describe, expect, it } from 'vitest';
import {
	makeReservation,
	postCharge,
	postRoomNights,
	pricedItem,
	staffClient,
	todayISO,
	unwrap,
	type Fixture,
	type Item
} from '../helpers/db';

async function line(transactionid: number): Promise<{ transamount: number; transquantity: number }> {
	const db = await staffClient();
	const [row] = unwrap(
		await db.from('transactions').select('transamount, transquantity').eq('transactionid', transactionid)
	) as { transamount: number; transquantity: number }[];
	return { transamount: Number(row.transamount), transquantity: row.transquantity };
}

describe('price charges from the lodge price lists', () => {
	let fx: Fixture;
	let item: Item;
	const today = todayISO();

	beforeAll(async () => {
		fx = await makeReservation();
		item = await pricedItem();
	});

	it('defaults an inventory charge to list price × quantity', async () => {
		const id = await postCharge(fx, { inventoryid: item.inventoryid, quantity: 3 });
		expect(await line(id)).toEqual({
			transamount: Math.round(item.invamount * 3 * 100) / 100,
			transquantity: 3
		});
	});

	it('defaults a room-night charge to the rate of the type asked for × nights, Double when none is', async () => {
		// A room whose Regular (Double) and Split rates differ today, read from the rate table.
		const db = await staffClient();
		const rows = unwrap(
			await db
				.from('room_rates')
				.select('roomid, roomratetype, roomrate')
				.eq('roomratearchive', false)
				.lte('roomratestartdate', today)
				.gte('roomrateenddate', today)
				.in('roomratetype', ['Regular', 'Split'])
		) as { roomid: number; roomratetype: string; roomrate: number }[];
		const byRoom = new Map<number, Record<string, number>>();
		for (const r of rows) {
			byRoom.set(r.roomid, { ...byRoom.get(r.roomid), [r.roomratetype]: Number(r.roomrate) });
		}
		const [roomid, rate] = [...byRoom].find(([, t]) => t.Regular && t.Split && t.Regular !== t.Split)!;

		const double = await line(await postRoomNights(fx, null, { roomid, transdate: today }));
		expect(double).toEqual({ transamount: Math.round(rate.Regular * 3 * 100) / 100, transquantity: 3 });
		const split = await line(
			await postRoomNights(fx, null, { roomid, transdate: today, ratetype: 'Split' })
		);
		expect(split.transamount).toBe(Math.round(rate.Split * 3 * 100) / 100);
	});

	it('lets a manually supplied amount win over the list price', async () => {
		const id = await postCharge(fx, { inventoryid: item.inventoryid, amount: 123.45 });
		expect((await line(id)).transamount).toBe(123.45);
	});
});
