// Story: spec/features/review-deposits-received-appendix-detail.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

interface DepRow {
	payment_type: string;
	resnumber: number;
	guestlastname: string;
	guestfirstname: string | null;
	pymt_amount: number;
	funds: string;
	pymt_cdn: number;
}

let fx: Fixture;
let rows: DepRow[];

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: 'Deposit (Received)',
		p_paymenttype: 'Visa',
		p_amount: 175,
		p_paymentdate: fx.arrival
	});
	await rpc('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: 'Deposit (Received)',
		p_paymenttype: 'Cash',
		p_amount: 60,
		p_paymentdate: fx.arrival
	});
	rows = await rpc('report_deposits_received', { p_date: fx.arrival });
});

describe('review deposits received appendix detail', () => {
	it('lists each deposit with payment type, reservation, names, and amounts', () => {
		expect(rows).toHaveLength(2);
		const visa = rows.find((r) => r.payment_type === 'Visa')!;
		expect(visa.resnumber).toBe(fx.resnumber);
		expect(visa.guestlastname).toBe(fx.lastname);
		expect(Number(visa.pymt_amount)).toBe(175);
		expect(visa.funds).toBe('Canadian');
		expect(Number(visa.pymt_cdn)).toBe(175);
	});

	it('groups the lines by payment type', () => {
		const types = rows.map((r) => r.payment_type);
		expect(types).toEqual([...types].sort());
	});

	it('ties the day total to the DCAR deposit line', async () => {
		const total = rows.reduce((s, r) => s + Number(r.pymt_cdn), 0);
		const upper = await rpc<{ item: string; amount: number }[]>('report_dcar_upper', {
			p_date: fx.arrival
		});
		expect(total).toBeCloseTo(
			Number(upper.find((r) => r.item === 'Deposit (Received)')?.amount),
			2
		);
	});
});
