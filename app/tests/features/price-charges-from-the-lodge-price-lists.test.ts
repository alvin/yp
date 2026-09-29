// Story: spec/features/price-charges-from-the-lodge-price-lists.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, staffClient, todayISO, unwrap, type Fixture } from '../helpers/db';

describe('price charges from the lodge price lists', () => {
	let fx: Fixture;
	const today = todayISO();

	beforeAll(async () => {
		fx = await makeReservation();
	});

	it('defaults an inventory charge to list price × quantity', async () => {
		const client = await staffClient();
		const items = unwrap(
			await client
				.from('inventory_items')
				.select('inventoryid, invamount')
				.eq('invarchive', false)
				.gt('invamount', 0)
				.limit(1)
		) as { inventoryid: number; invamount: number }[];
		const txid = await rpc<number>('post_charge', {
			p_reservationguestid: fx.reservationguestid,
			p_inventoryid: items[0].inventoryid,
			p_quantity: 3,
			p_transdate: today
		});
		const tx = unwrap(
			await client.from('transactions').select('transamount').eq('transactionid', txid)
		) as { transamount: number }[];
		expect(tx[0].transamount).toBe(Math.round(items[0].invamount * 3 * 100) / 100);
	});

	it('defaults a room-night charge to the rate of the type chosen × nights', async () => {
		const client = await staffClient();
		// A room whose Regular and Split rates differ today, read from the rate table.
		const rows = unwrap(
			await client
				.from('room_rates')
				.select('roomid, roomratetype, roomrate')
				.eq('roomratearchive', false)
				.lte('roomratestartdate', today)
				.gte('roomrateenddate', today)
				.in('roomratetype', ['Regular', 'Split'])
		) as { roomid: number; roomratetype: string; roomrate: number }[];
		const byRoom = new Map<number, Record<string, number>>();
		for (const r of rows) byRoom.set(r.roomid, { ...byRoom.get(r.roomid), [r.roomratetype]: Number(r.roomrate) });
		const [roomid, rate] = [...byRoom].find(([, t]) => t.Regular && t.Split && t.Regular !== t.Split)!;

		const post = (ratetype?: string) =>
			rpc<number>('post_room_nights', {
				p_reservationguestid: fx.reservationguestid,
				p_roomid: roomid,
				p_occupancyin: fx.arrival,
				p_occupancyout: fx.departure,
				p_transdate: today,
				...(ratetype ? { p_ratetype: ratetype } : {})
			});
		const line = async (txid: number) =>
			(
				unwrap(
					await client
						.from('transactions')
						.select('transamount, transquantity')
						.eq('transactionid', txid)
				) as { transamount: number; transquantity: number }[]
			)[0];

		const regular = await line(await post());
		expect(regular.transquantity).toBe(3);
		expect(Number(regular.transamount)).toBe(Math.round(rate.Regular * 3 * 100) / 100);
		const split = await line(await post('Split'));
		expect(Number(split.transamount)).toBe(Math.round(rate.Split * 3 * 100) / 100);
	});

	it('lets a manually supplied amount win over the list price', async () => {
		const client = await staffClient();
		const items = unwrap(
			await client
				.from('inventory_items')
				.select('inventoryid')
				.eq('invarchive', false)
				.gt('invamount', 0)
				.limit(1)
		) as { inventoryid: number }[];
		const txid = await rpc<number>('post_charge', {
			p_reservationguestid: fx.reservationguestid,
			p_inventoryid: items[0].inventoryid,
			p_quantity: 1,
			p_transdate: today,
			p_amount: 123.45
		});
		const tx = unwrap(
			await client
				.from('transactions')
				.select('transamount, transgstamount')
				.eq('transactionid', txid)
		) as { transamount: number; transgstamount: number }[];
		expect(tx[0].transamount).toBe(123.45);
	});

	it('computes taxes on the final line amount', async () => {
		const gst = await rpc<number>('effective_tax_rate', { p_taxratetype: 'GST', p_date: today });
		const client = await staffClient();
		const items = unwrap(
			await client
				.from('inventory_items')
				.select('inventoryid')
				.eq('invarchive', false)
				.eq('invgst', true)
				.gt('invamount', 0)
				.limit(1)
		) as { inventoryid: number }[];
		const txid = await rpc<number>('post_charge', {
			p_reservationguestid: fx.reservationguestid,
			p_inventoryid: items[0].inventoryid,
			p_quantity: 1,
			p_transdate: today,
			p_amount: 200
		});
		const tx = unwrap(
			await client.from('transactions').select('transgstamount').eq('transactionid', txid)
		) as { transgstamount: number }[];
		expect(tx[0].transgstamount).toBe(Math.round(200 * gst * 100) / 100);
	});
});
