// Story: spec/features/post-room-night-and-extra-charges.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

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

	it('updates the reservation total to include posted lines', async () => {
		const balance = await rpc<number>('reservation_balance', { p_reservationid: fx.reservationid });
		expect(Number(balance)).toBeGreaterThan(0);
	});
});
