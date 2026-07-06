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

	it('defaults a room-night charge to the effective room rate × nights', async () => {
		const client = await staffClient();
		// Find a room-rate row and use a date inside its window.
		const rates = unwrap(
			await client
				.from('room_rates')
				.select('roomid, roomrate, roomratestartdate, roomrateenddate')
				.eq('roomratearchive', false)
				.limit(1)
		) as { roomid: number; roomrate: number; roomratestartdate: string }[];
		if (!rates.length) return; // environment without seeded room rates
		const date = rates[0].roomratestartdate.slice(0, 10);
		const effective = await rpc<number | null>('effective_room_rate', {
			p_roomid: rates[0].roomid,
			p_date: date
		});
		expect(effective).not.toBeNull();

		const txid = await rpc<number>('post_room_nights', {
			p_reservationguestid: fx.reservationguestid,
			p_roomid: rates[0].roomid,
			p_occupancyin: fx.arrival,
			p_occupancyout: fx.departure,
			p_rate: null,
			p_transdate: date
		});
		const tx = unwrap(
			await client.from('transactions').select('transamount, transquantity').eq('transactionid', txid)
		) as { transamount: number; transquantity: number }[];
		expect(tx[0].transamount).toBe(Math.round(Number(effective) * tx[0].transquantity * 100) / 100);
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
