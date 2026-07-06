// Story: spec/features/calculate-taxes-from-dated-rate-tables.feature

import { describe, expect, it, beforeAll } from 'vitest';
import { makeReservation, rpc, staffClient, todayISO, unwrap, type Fixture } from '../helpers/db';

interface Tx {
	transactionid: number;
	transamount: number;
	transgstamount: number;
	transpstamount: number;
	transltamount: number;
	transrtamount: number;
	transdmtamount: number;
}

async function rate(type: string, date: string): Promise<number> {
	return rpc<number>('effective_tax_rate', { p_taxratetype: type, p_date: date });
}

async function getTx(id: number): Promise<Tx> {
	const client = await staffClient();
	const rows = unwrap(
		await client.from('transactions').select('*').eq('transactionid', id)
	) as Tx[];
	return rows[0];
}

describe('calculate taxes from dated rate tables', () => {
	let fx: Fixture;
	const today = todayISO();

	beforeAll(async () => {
		fx = await makeReservation();
	});

	it('computes each tax column from flags × the rate effective on the transaction date', async () => {
		const client = await staffClient();
		const room = unwrap(
			await client.from('rooms').select('*').eq('roomarchive', false).order('roomorder').limit(1)
		) as Record<string, unknown>[];
		const r = room[0] as { roomid: number; roomgst: boolean; roomrt: boolean; roomdmt: boolean };

		const txid = await rpc<number>('post_room_nights', {
			p_reservationguestid: fx.reservationguestid,
			p_roomid: r.roomid,
			p_occupancyin: fx.arrival,
			p_occupancyout: fx.departure,
			p_rate: 200,
			p_transdate: today
		});
		const tx = await getTx(txid);
		expect(tx.transamount).toBe(600);
		const gst = await rate('GST', today);
		expect(tx.transgstamount).toBe(r.roomgst ? Math.round(600 * gst * 100) / 100 : 0);
		const rt = await rate('Room', today);
		expect(tx.transrtamount).toBe(r.roomrt ? Math.round(600 * rt * 100) / 100 : 0);
	});

	it('keeps flagged-off taxes at zero', async () => {
		const client = await staffClient();
		// A GST-only inventory item (massage services carry no taxes in the seed;
		// find any item with at least one flag off).
		const items = unwrap(
			await client
				.from('inventory_items')
				.select('inventoryid, invpst')
				.eq('invarchive', false)
				.eq('invpst', false)
				.gt('invamount', 0)
				.limit(1)
		) as { inventoryid: number }[];
		const txid = await rpc<number>('post_charge', {
			p_reservationguestid: fx.reservationguestid,
			p_inventoryid: items[0].inventoryid,
			p_quantity: 1,
			p_transdate: today
		});
		const tx = await getTx(txid);
		expect(tx.transpstamount).toBe(0);
	});

	it('recomputes taxes when the amount changes', async () => {
		const txid = await rpc<number>('post_charge', {
			p_reservationguestid: fx.reservationguestid,
			p_inventoryid: await gstItem(),
			p_quantity: 1,
			p_transdate: today,
			p_amount: 100
		});
		const client = await staffClient();
		unwrap(await client.from('transactions').update({ transamount: 250 }).eq('transactionid', txid).select());
		const tx = await getTx(txid);
		const gst = await rate('GST', today);
		expect(tx.transgstamount).toBe(Math.round(250 * gst * 100) / 100);
	});

	it('preserves explicitly supplied tax amounts on insert (legacy import path)', async () => {
		const client = await staffClient();
		const rows = unwrap(
			await client
				.from('transactions')
				.insert({
					reservationguestid: fx.reservationguestid,
					transdate: today,
					transtype: 'Sundries',
					transquantity: 1,
					transamount: 100,
					transgstamount: 3.21,
					transpstamount: 0
				})
				.select('transgstamount')
		) as { transgstamount: number }[];
		expect(rows[0].transgstamount).toBe(3.21);
	});
});

async function gstItem(): Promise<number> {
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
	return items[0].inventoryid;
}
