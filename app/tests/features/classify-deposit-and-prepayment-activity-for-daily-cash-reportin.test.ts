// Story: spec/features/classify-deposit-and-prepayment-activity-for-daily-cash-reportin.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;
let upper: { group_name: string; item: string; amount: number }[];

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
		p_paymentcategory: 'Prepayment (Received)',
		p_paymenttype: 'Cheque',
		p_amount: 70,
		p_paymentdate: fx.arrival
	});
	upper = await rpc('report_dcar_upper', { p_date: fx.arrival });
});

const adj = (item: string) => upper.find((r) => r.group_name === 'Adjustments' && r.item === item);

describe('classify deposit and prepayment activity for daily cash reporting', () => {
	it('keeps deposits and prepayments on their own classified lines', () => {
		expect(Number(adj('Deposit (Received)')?.amount)).toBe(100);
		expect(Number(adj('Prepayment (Received)')?.amount)).toBe(70);
	});

	it('prints the full classification set even when idle', () => {
		for (const item of [
			'Deposit (Received)',
			'Prepayment (Received)',
			'Deposit (Refund)',
			'Prepayment (Refund)',
			'Deposit (Applied)',
			'Prepayment (Applied)'
		]) {
			expect(adj(item)).toBeDefined();
		}
	});

	it('feeds the classified activity into the day total', async () => {
		const total = await rpc<number>('report_dcar_total', { p_date: fx.arrival });
		expect(Number(total)).toBe(170);
	});
});
