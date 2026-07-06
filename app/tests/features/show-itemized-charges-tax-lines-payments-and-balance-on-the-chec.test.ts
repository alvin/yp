// Story: spec/features/show-itemized-charges-tax-lines-payments-and-balance-on-the-chec.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, todayISO, type Fixture } from '../helpers/db';

interface BillLine {
	sort_group: string;
	description: string;
	quantity: number;
	amount: number;
	display_sign: string;
}

let fx: Fixture;
let header: Record<string, number>;
let lines: BillLine[];

beforeAll(async () => {
	// Today-dated stay so the dated tax tables apply to the bill.
	fx = await makeReservation({ arrival: todayISO(), departure: addDays(todayISO(), 3) });
	await rpc('post_room_nights', {
		p_reservationguestid: fx.reservationguestid,
		p_roomid: (await rpc<{ roomid: number }[]>('room_directory'))[0].roomid,
		p_occupancyin: fx.arrival,
		p_occupancyout: fx.departure,
		p_rate: 200,
		p_transdate: todayISO()
	});
	await rpc('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: 'Deposit (Received)',
		p_paymenttype: 'Visa',
		p_amount: 100,
		p_paymentdate: todayISO()
	});
	header = (
		await rpc<Record<string, number>[]>('report_checkout_bill_header', {
			p_reservationid: fx.reservationid
		})
	)[0];
	lines = await rpc('report_checkout_bill_lines', { p_reservationid: fx.reservationid });
});

describe('show itemized charges, tax lines, payments, and balance on the checkout bill', () => {
	it('itemizes the charges', () => {
		const charges = lines.filter((l) => l.sort_group === 'charges');
		expect(charges.length).toBeGreaterThan(0);
		expect(Number(charges[0].amount)).toBe(600);
		expect(Number(charges[0].quantity)).toBe(3);
	});

	it('carries the tax lines on the bill header', () => {
		expect(Number(header.tax_gst)).toBeGreaterThan(0);
		expect(Number(header.subtotal)).toBeGreaterThan(600);
	});

	it('lists payments and deposits with their sign', () => {
		const settlements = lines.filter((l) => l.sort_group === 'settlements');
		expect(settlements.length).toBe(1);
		expect(settlements[0].display_sign).toBe('−');
		expect(Number(settlements[0].amount)).toBe(100);
	});

	it('shows the balance owing consistent with the ledger', async () => {
		const balance = await rpc<number>('reservation_balance', { p_reservationid: fx.reservationid });
		expect(Number(header.balance_owing)).toBeCloseTo(Number(balance), 2);
	});
});
