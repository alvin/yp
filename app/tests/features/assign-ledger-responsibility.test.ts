// Story: spec/features/assign-ledger-responsibility.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, staffClient, uid, unwrap, type Fixture } from '../helpers/db';

let fx: Fixture;
let rgid2: number;

beforeAll(async () => {
	fx = await makeReservation();
	const other = await rpc<number>('create_guest', { p_lastname: `ZZLedger-${uid()}` });
	rgid2 = await rpc<number>('add_reservation_guest', {
		p_reservationid: fx.reservationid,
		p_guestid: other
	});
});

describe('assign ledger responsibility', () => {
	it('lets a charge be assigned to a specific reservation guest', async () => {
		await rpc('record_payment', {
			p_reservationguestid: rgid2,
			p_paymentcategory: 'Payment (Regular)',
			p_paymenttype: 'Cash',
			p_amount: 25,
			p_paymentdate: fx.arrival
		});
		const rows = await rpc<{ line_source: string; reservationguestid: number }[]>(
			'reservation_ledger',
			{ p_reservationid: fx.reservationid }
		);
		expect(rows.some((r) => r.reservationguestid === rgid2)).toBe(true);
	});

	it('keeps the assigned guest associated after saving', async () => {
		const roomid = (await rpc<{ roomid: number }[]>('room_directory'))[0].roomid;
		const txid = await rpc<number>('post_room_nights', {
			p_reservationguestid: rgid2,
			p_roomid: roomid,
			p_occupancyin: fx.arrival,
			p_occupancyout: fx.departure,
			p_rate: 100,
			p_transdate: fx.arrival
		});
		const client = await staffClient();
		const tx = unwrap(
			await client.from('transactions').select('reservationguestid').eq('transactionid', txid)
		) as { reservationguestid: number }[];
		expect(tx[0].reservationguestid).toBe(rgid2);
	});

	it('reflects responsibility in per-guest balances', async () => {
		const client = await staffClient();
		const rgs = unwrap(
			await client
				.from('v_reservation_guest_summary')
				.select('reservationguestid, balance_owing')
				.eq('reservationid', fx.reservationid)
		) as { reservationguestid: number; balance_owing: number }[];
		const b2 = rgs.find((r) => r.reservationguestid === rgid2);
		expect(Number(b2?.balance_owing)).not.toBe(0);
	});

	it('shows who was responsible in printed daily activity', async () => {
		const rows = await rpc<{ resnumber: number; guest: string }[]>('report_cashier_detail', {
			p_date: fx.arrival
		});
		expect(rows.some((r) => r.resnumber === fx.resnumber && r.guest.startsWith('ZZLedger'))).toBe(
			true
		);
	});
});
