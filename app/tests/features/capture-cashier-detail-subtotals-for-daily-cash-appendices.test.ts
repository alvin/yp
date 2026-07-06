// Story: spec/features/capture-cashier-detail-subtotals-for-daily-cash-appendices.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

interface CashRow {
	payment_type: string;
	pymt_category: string;
	amount: number;
	resnumber: number;
}

let fx: Fixture;
let rows: CashRow[];

beforeAll(async () => {
	fx = await makeReservation();
	for (const [type, amount] of [
		['Visa', 120],
		['Visa', 30],
		['Cash', 55]
	] as const) {
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Payment (Regular)',
			p_paymenttype: type,
			p_amount: amount,
			p_paymentdate: fx.arrival
		});
	}
	rows = await rpc('report_cashier_detail', { p_date: fx.arrival });
});

describe('capture cashier detail subtotals for daily cash appendices', () => {
	it('orders receipts by tender so each type subtotals cleanly', () => {
		const types = rows.map((r) => r.payment_type);
		expect(types).toEqual(['Cash', 'Visa', 'Visa']);
	});

	it('subtotals each payment type from its lines', () => {
		const visa = rows.filter((r) => r.payment_type === 'Visa').reduce((s, r) => s + Number(r.amount), 0);
		expect(visa).toBe(150);
		const cash = rows.filter((r) => r.payment_type === 'Cash').reduce((s, r) => s + Number(r.amount), 0);
		expect(cash).toBe(55);
	});

	it('grand-totals to the day’s receipts', async () => {
		const total = rows.reduce((s, r) => s + Number(r.amount), 0);
		const receipts = await rpc<number>('report_dcar_receipts_total', { p_date: fx.arrival });
		expect(total).toBeCloseTo(Number(receipts), 2);
	});
});
