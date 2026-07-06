// Story: spec/features/show-donation-line-in-daily-cash-upper-section.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: 'Donation',
		p_paymenttype: 'Cash',
		p_amount: 25,
		p_paymentdate: fx.arrival
	});
});

describe('show donation line in daily cash upper section', () => {
	it('lands recorded donations on the Donation line', async () => {
		const upper = await rpc<{ group_name: string; item: string; amount: number }[]>(
			'report_dcar_upper',
			{ p_date: fx.arrival }
		);
		expect(
			Number(upper.find((r) => r.group_name === 'Adjustments' && r.item === 'Donation')?.amount)
		).toBe(25);
	});

	it('includes the donation in the upper total and receipts', async () => {
		expect(Number(await rpc('report_dcar_total', { p_date: fx.arrival }))).toBe(25);
		expect(Number(await rpc('report_dcar_receipts_total', { p_date: fx.arrival }))).toBe(25);
	});
});
