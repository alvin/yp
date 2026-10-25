// Story: spec/features/show-itemized-charges-tax-lines-payments-and-balance-on-the-chec.feature
import { beforeAll, describe, expect, it } from 'vitest';
import {
	addDays,
	makeReservation,
	pay,
	postRoomNights,
	rpc,
	staffClient,
	todayISO,
	unwrap,
	type Fixture
} from '../helpers/db';

interface BillLine {
	sort_group: string;
	description: string;
	quantity: number;
	amount: number;
	display_sign: string;
}

const TAXES = [
	['tax_gst', 'transgstamount'],
	['tax_pst', 'transpstamount'],
	['tax_hst', 'transhstamount'],
	['tax_liquor', 'transltamount'],
	['tax_room', 'transrtamount'],
	['tax_hotel', 'transhtamount'],
	['tax_dmt', 'transdmtamount']
] as const;

let fx: Fixture;
let header: Record<string, number>;
let lines: BillLine[];
let charged: Record<string, number>;

beforeAll(async () => {
	// Dated today, so the dated tax tables apply to the room nights.
	fx = await makeReservation({ arrival: todayISO(), departure: addDays(todayISO(), 3) });
	const id = await postRoomNights(fx, 200, { transdate: todayISO() });
	await pay(fx, 'Deposit (Received)', 100, { date: todayISO() });
	const db = await staffClient();
	[charged] = unwrap(await db.from('transactions').select('*').eq('transactionid', id)) as Record<
		string,
		number
	>[];
	[header] = await rpc<Record<string, number>[]>('report_checkout_bill_header', {
		p_reservationid: fx.reservationid
	});
	lines = await rpc('report_checkout_bill_lines', { p_reservationid: fx.reservationid });
});

describe('show itemized charges, tax lines, payments, and balance on the checkout bill', () => {
	it('itemizes the charges', () => {
		const charges = lines.filter((l) => l.sort_group === 'charges');
		expect(charges.map((l) => [Number(l.quantity), Number(l.amount)])).toEqual([[3, 600]]);
	});

	it('carries each tax the charges bear, and the subtotal with them', () => {
		expect(Number(header.tax_gst)).toBeGreaterThan(0);
		let taxes = 0;
		for (const [line, column] of TAXES) {
			expect(Number(header[line]), line).toBe(Number(charged[column]));
			taxes += Number(charged[column]);
		}
		expect(Number(header.subtotal)).toBeCloseTo(600 + taxes, 2);
	});

	it('lists the deposit as a payment taken off, and shows the balance left', () => {
		const settlements = lines.filter((l) => l.sort_group === 'settlements');
		expect(settlements.map((l) => [l.display_sign, Number(l.amount)])).toEqual([['−', 100]]);
		expect(Number(header.balance_owing)).toBeCloseTo(Number(header.subtotal) - 100, 2);
	});
});
