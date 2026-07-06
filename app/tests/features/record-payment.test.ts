// Story: spec/features/record-payment.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

interface LedgerRow {
	line_source: string;
	line_type: string;
	amount: number;
	balance_effect: number;
}

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('post_room_nights', {
		p_reservationguestid: fx.reservationguestid,
		p_roomid: (await rpc<{ roomid: number }[]>('room_directory'))[0].roomid,
		p_occupancyin: fx.arrival,
		p_occupancyout: fx.departure,
		p_rate: 100,
		p_transdate: fx.arrival
	});
});

describe('record payment', () => {
	it('adds a payment to the reservation', async () => {
		const id = await rpc<number>('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Payment (Regular)',
			p_paymenttype: 'Visa',
			p_amount: 120,
			p_paymentdate: fx.arrival
		});
		expect(id).toBeGreaterThan(0);
	});

	it('reduces the stay balance appropriately', async () => {
		const before = await rpc<number>('reservation_balance', { p_reservationid: fx.reservationid });
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Payment (Regular)',
			p_paymenttype: 'Cash',
			p_amount: 50,
			p_paymentdate: fx.arrival
		});
		const after = await rpc<number>('reservation_balance', { p_reservationid: fx.reservationid });
		expect(Number(after)).toBeCloseTo(Number(before) - 50, 2);
	});

	it('shows the payment in the reservation financial history', async () => {
		const rows = await rpc<LedgerRow[]>('reservation_ledger', { p_reservationid: fx.reservationid });
		const pay = rows.filter((r) => r.line_source === 'payment');
		expect(pay.length).toBeGreaterThan(0);
		expect(pay[0].balance_effect).toBeLessThan(0);
	});

	it('is reviewable after saving', async () => {
		const rows = await rpc<LedgerRow[]>('reservation_ledger', { p_reservationid: fx.reservationid });
		expect(rows.some((r) => r.line_type === 'Payment (Regular)')).toBe(true);
	});
});
