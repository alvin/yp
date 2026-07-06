// Story: spec/features/group-deposit-appendix-lines-by-payment-type.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

interface DepRow {
	payment_type: string;
	funds: string;
	pymt_amount: number;
	pymt_cdn: number;
}

let fx: Fixture;
let rows: DepRow[];

beforeAll(async () => {
	fx = await makeReservation();
	for (const [type, amount] of [
		['Visa', 100],
		['Cash', 50],
		['Visa', 80]
	] as const) {
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: type,
			p_amount: amount,
			p_paymentdate: fx.arrival
		});
	}
	rows = await rpc('report_deposits_received', { p_date: fx.arrival });
});

describe('group deposit appendix lines by payment type', () => {
	it('keeps lines of the same payment type together', () => {
		const types = rows.map((r) => r.payment_type);
		expect(types).toEqual(['Cash', 'Visa', 'Visa']);
	});

	it('shows funds and Canadian amounts on every line within a group', () => {
		for (const r of rows) {
			expect(r.funds).toBeTruthy();
			expect(Number(r.pymt_cdn)).toBeGreaterThan(0);
		}
	});
});
