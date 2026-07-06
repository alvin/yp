// Story: spec/features/capture-tax-details.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, staffClient, todayISO, unwrap, type Fixture } from '../helpers/db';

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
});

describe('capture tax details', () => {
	it('stores the details needed for tax calculation on each line', async () => {
		const client = await staffClient();
		const roomid = (await rpc<{ roomid: number }[]>('room_directory'))[0].roomid;
		const txid = await rpc<number>('post_room_nights', {
			p_reservationguestid: fx.reservationguestid,
			p_roomid: roomid,
			p_occupancyin: fx.arrival,
			p_occupancyout: fx.departure,
			p_rate: 200,
			p_transdate: todayISO()
		});
		const rows = unwrap(
			await client
				.from('transactions')
				.select('transdate, transtype, roomid, transquantity, transamount')
				.eq('transactionid', txid)
		) as Record<string, unknown>[];
		expect(rows[0].transtype).toBe('Room');
		expect(rows[0].roomid).toBe(roomid);
		expect(rows[0].transamount).not.toBeNull();
	});

	it('supports a per-line tax breakdown for reporting', async () => {
		const rows = await rpc<{ line_source: string; tax_total: number }[]>('reservation_ledger', {
			p_reservationid: fx.reservationid
		});
		const charge = rows.find((r) => r.line_source === 'transaction');
		expect(Number(charge?.tax_total)).toBeGreaterThan(0);
	});

	it('feeds the recorded details into daily accounting output', async () => {
		const upper = await rpc<{ group_name: string; item: string }[]>('report_dcar_upper', {
			p_date: todayISO()
		});
		expect(upper.some((r) => r.group_name === 'Taxes' && r.item === 'GST')).toBe(true);
		expect(upper.some((r) => r.item === 'Total Taxes')).toBe(true);
	});
});
