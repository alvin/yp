// Story: spec/features/calculate-taxes-from-dated-rate-tables.feature

import { beforeAll, describe, expect, it } from 'vitest';
import {
	isolatedDate,
	ledger,
	makeReservation,
	postCharge,
	postRoomNights,
	roomDirectory,
	rpc,
	staffClient,
	todayISO,
	unwrap,
	type Fixture
} from '../helpers/db';

// Each tax column, the flag on a room or item that switches it on, and its
// rate type in the dated rate table.
const TAXES = [
	['transgstamount', 'gst', 'GST'],
	['transpstamount', 'pst', 'PST'],
	['transhstamount', 'hst', 'HST'],
	['transltamount', 'lt', 'Liquor'],
	['transrtamount', 'rt', 'Room'],
	['transhtamount', 'ht', 'Hotel'],
	['transdmtamount', 'dmt', 'DMT']
] as const;

type Column = (typeof TAXES)[number][0];
type Tx = Record<Column, number> & { transamount: number };

const today = todayISO();
const rates: Record<string, number> = {};

async function tx(id: number): Promise<Tx> {
	const db = await staffClient();
	const [row] = unwrap(await db.from('transactions').select('*').eq('transactionid', id)) as Tx[];
	return row;
}

async function update(id: number, values: Record<string, unknown>): Promise<void> {
	const db = await staffClient();
	unwrap(await db.from('transactions').update(values).eq('transactionid', id).select('transactionid'));
}

/** The taxes on `amount` for the flags given, at today's rates. */
function taxesFor(flags: Record<string, boolean>, amount: number): Record<Column, number> {
	return Object.fromEntries(
		TAXES.map(([column, flag, type]) => [
			column,
			flags[flag] ? Math.round(amount * rates[type] * 100) / 100 : 0
		])
	) as Record<Column, number>;
}

const taxesOf = (row: Tx) =>
	Object.fromEntries(TAXES.map(([column]) => [column, Number(row[column])])) as Record<Column, number>;

async function itemWith(flags: Record<string, boolean>): Promise<{ inventoryid: number } & Record<string, boolean>> {
	const db = await staffClient();
	let query = db
		.from('inventory_items')
		.select('inventoryid, invgst, invpst, invhst, invlt, invrt, invht, invdmt')
		.eq('invarchive', false)
		.gt('invamount', 0);
	for (const [flag, on] of Object.entries(flags)) query = query.eq(`inv${flag}`, on);
	const [item] = unwrap(await query.order('inventoryid').limit(1)) as Record<string, number | boolean>[];
	return Object.fromEntries(
		Object.entries(item).map(([k, v]) => [k === 'inventoryid' ? k : k.replace(/^inv/, ''), v])
	) as { inventoryid: number } & Record<string, boolean>;
}

describe('calculate taxes from dated rate tables', () => {
	let fx: Fixture;

	beforeAll(async () => {
		fx = await makeReservation();
		for (const [, , type] of TAXES) {
			rates[type] = Number(await rpc('effective_tax_rate', { p_taxratetype: type, p_date: today }));
		}
		// The rate tables cover today; a zero rate here would let a broken
		// calculation pass.
		expect(rates.GST).toBeGreaterThan(0);
		expect(rates.Liquor).toBeGreaterThan(0);
	});

	it('computes every tax column on a room night from the room’s flags and the rate on the date', async () => {
		const db = await staffClient();
		const [room] = await roomDirectory();
		const [flags] = unwrap(
			await db
				.from('rooms')
				.select('roomgst, roompst, roomhst, roomrt, roomht, roomdmt')
				.eq('roomid', room.roomid)
		) as Record<string, boolean>[];
		const roomFlags = Object.fromEntries(
			Object.entries(flags).map(([k, v]) => [k.replace(/^room/, ''), v])
		);
		expect(roomFlags.gst).toBe(true);
		const id = await postRoomNights(fx, 200, { roomid: room.roomid, transdate: today });
		const line = await tx(id);
		expect(Number(line.transamount)).toBe(600);
		expect(taxesOf(line)).toEqual(taxesFor(roomFlags, 600));
	});

	it('computes the liquor tax on a liquor item, and leaves a tax whose flag is off at zero', async () => {
		const liquor = await itemWith({ lt: true, pst: false });
		const line = await tx(await postCharge(fx, { inventoryid: liquor.inventoryid, amount: 40, transdate: today }));
		expect(Number(line.transltamount)).toBe(Math.round(40 * rates.Liquor * 100) / 100);
		expect(Number(line.transltamount)).toBeGreaterThan(0);
		expect(Number(line.transpstamount)).toBe(0);
		expect(taxesOf(line)).toEqual(taxesFor(liquor, 40));
	});

	it('recomputes the taxes when the amount, date, item or room is edited', async () => {
		const gstItem = await itemWith({ gst: true });
		const id = await postCharge(fx, { inventoryid: gstItem.inventoryid, amount: 100, transdate: today });
		const gst = (amount: number) => Math.round(amount * rates.GST * 100) / 100;

		await update(id, { transamount: 250 });
		expect(Number((await tx(id)).transgstamount)).toBe(gst(250));

		// A historical date the rate tables do not cover carries no tax.
		await update(id, { transdate: isolatedDate() });
		expect(Number((await tx(id)).transgstamount)).toBe(0);
		await update(id, { transdate: today });
		expect(Number((await tx(id)).transgstamount)).toBe(gst(250));

		const untaxed = await itemWith({ gst: false });
		await update(id, { inventoryid: untaxed.inventoryid });
		expect(Number((await tx(id)).transgstamount)).toBe(0);

		// A stored tax left wrong by hand is put right when the room changes.
		const [first, second] = await roomDirectory();
		const night = await postRoomNights(fx, 100, { roomid: first.roomid, transdate: today });
		const expected = Number((await tx(night)).transgstamount);
		await update(night, { transgstamount: 999 });
		await update(night, { roomid: second.roomid });
		expect(Number((await tx(night)).transgstamount)).toBe(expected);
	});

	it('preserves tax amounts the legacy import supplies', async () => {
		const db = await staffClient();
		const [row] = unwrap(
			await db
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
		expect(Number(row.transgstamount)).toBe(3.21);
	});

	it('carries each charge’s tax total on the reservation ledger', async () => {
		const charges = (await ledger(fx.reservationid)).filter((l) => l.line_source === 'transaction');
		expect(charges.length).toBe(5);
		const db = await staffClient();
		for (const charge of charges) {
			const [row] = unwrap(
				await db.from('transactions').select('*').eq('transactionid', charge.line_id)
			) as Tx[];
			const total = Object.values(taxesOf(row)).reduce((s, t) => s + t, 0);
			expect(Number(charge.tax_total), charge.description).toBeCloseTo(total, 2);
		}
	});
});
