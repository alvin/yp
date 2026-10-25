// Story: spec/features/show-tender-types.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, pay, rpc, type Fixture } from '../helpers/db';

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
	'Paid Out'
];

let fx: Fixture;
let rows: { paymenttype: string; calc_amount: number; sort_order: number }[];

beforeAll(async () => {
	fx = await makeReservation();
	await pay(fx, 'Payment (Regular)', 42, { type: 'Amex' });
	rows = await rpc('report_dcar_payments', { p_date: fx.arrival });
});

describe('show tender types', () => {
	it('lists the lodge’s full tender set, including the US variants', () => {
		expect(rows.map((r) => r.paymenttype).sort()).toEqual([...TENDERS].sort());
	});

	it('keeps the tenders in their established order', () => {
		const orders = rows.map((r) => r.sort_order);
		expect(orders).toEqual([...orders].sort((a, b) => a - b));
	});

	it('lands each payment on its tender line', () => {
		expect(Number(rows.find((r) => r.paymenttype === 'Amex')?.calc_amount)).toBe(42);
	});

	it('prints a gift certificate or a bill sent to accounts only when a receipt was filed under it', async () => {
		const day = await makeReservation();
		const tenders = () =>
			rpc<{ paymenttype: string; calc_amount: number }[]>('report_dcar_payments', {
				p_date: day.arrival
			});
		await pay(day, 'Gift Certificate Received', 40, { type: 'Gift Certificate' });
		await pay(day, 'A/R (Sent To Accounts)', 15, { type: 'None (Sent to A/R)' });
		const settled = (await tenders()).map((t) => t.paymenttype);
		expect(settled).not.toContain('Gift Certificate');
		expect(settled).not.toContain('None (Sent to A/R)');

		await pay(day, 'Payment (Regular)', 25, { type: 'Gift Certificate' });
		expect(
			Number((await tenders()).find((t) => t.paymenttype === 'Gift Certificate')?.calc_amount)
		).toBe(25);
	});

	it('adds the tender lines up to the day’s receipts, for reconciling by hand', async () => {
		const sum = rows.reduce((s, r) => s + Number(r.calc_amount), 0);
		expect(sum).toBe(42);
		expect(Number(await rpc('report_dcar_receipts_total', { p_date: fx.arrival }))).toBe(42);
	});
});
