// Story: spec/features/show-balance-sheet-adjustments.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: 'Deposit (Received)',
		p_paymenttype: 'Visa',
		p_amount: 100,
		p_paymentdate: fx.arrival
	});
	await rpc('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: 'Deposit (Refund)',
		p_paymenttype: 'Visa',
		p_amount: 40,
		p_paymentdate: fx.arrival
	});
});

describe('show balance-sheet adjustments', () => {
	it('shows deposit recognition as adjustment lines below the taxes', async () => {
		const upper = await rpc<{ group_name: string; item: string; amount: number }[]>(
			'report_dcar_upper',
			{ p_date: fx.arrival }
		);
		expect(
			Number(upper.find((r) => r.group_name === 'Adjustments' && r.item === 'Deposit (Received)')?.amount)
		).toBe(100);
		expect(
			Number(upper.find((r) => r.group_name === 'Adjustments' && r.item === 'Deposit (Refund)')?.amount)
		).toBe(-40);
	});

	it('nets the adjustments into the day’s total', async () => {
		const total = await rpc<number>('report_dcar_total', { p_date: fx.arrival });
		expect(Number(total)).toBe(60);
	});
});
