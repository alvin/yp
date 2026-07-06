// Story: spec/features/show-tender-types.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

const TENDERS = [
	'Mastercard',
	'Visa',
	'Amex',
	'Debit Card',
	'Cash',
	'Cheque',
	"Traveller's Cheque",
	'U.S. Cash',
	'U.S. Cheque',
	"U.S. Traveller's Cheque",
	'U.S. Exchange',
	'Gift Certificate',
	'None (Sent to A/R)',
	'Paid Out',
	'ICS Crossover'
];

let fx: Fixture;
let rows: { paymenttype: string; calc_amount: number; sort_order: number }[];

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: 'Payment (Regular)',
		p_paymenttype: 'Amex',
		p_amount: 42,
		p_paymentdate: fx.arrival
	});
	rows = await rpc('report_dcar_payments', { p_date: fx.arrival });
});

describe('show tender types', () => {
	it('lists the lodge’s full tender set, including the US variants', () => {
		for (const t of TENDERS) expect(rows.some((r) => r.paymenttype === t)).toBe(true);
	});

	it('keeps the tenders in their established order', () => {
		const orders = rows.map((r) => r.sort_order);
		expect(orders).toEqual([...orders].sort((a, b) => a - b));
	});

	it('lands each payment on its tender line', () => {
		expect(Number(rows.find((r) => r.paymenttype === 'Amex')?.calc_amount)).toBe(42);
	});

	it('supports reconciling receipts by type against the day total', async () => {
		const sum = rows.reduce((s, r) => s + Number(r.calc_amount), 0);
		const receipts = await rpc<number>('report_dcar_receipts_total', { p_date: fx.arrival });
		expect(sum).toBeCloseTo(Number(receipts), 2);
	});
});
