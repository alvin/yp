// Story: spec/features/review-upper-balancing-structure.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

interface UpperRow {
	group_name: string;
	item: string;
	amount: number;
	sort_order: number;
}

let fx: Fixture;
let upper: UpperRow[];

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('post_room_nights', {
		p_reservationguestid: fx.reservationguestid,
		p_roomid: (await rpc<{ roomid: number }[]>('room_directory'))[0].roomid,
		p_occupancyin: fx.arrival,
		p_occupancyout: fx.departure,
		p_rate: 100,
		p_transdate: fx.arrival
	});
	await rpc('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: 'Deposit (Received)',
		p_paymenttype: 'Visa',
		p_amount: 60,
		p_paymentdate: fx.arrival
	});
	upper = await rpc<UpperRow[]>('report_dcar_upper', { p_date: fx.arrival });
});

describe('review upper balancing structure', () => {
	it('lists revenue by charge type, then taxes, then adjustments', async () => {
		const groups = upper.map((r) => r.group_name);
		expect(groups[0]).toBe('Revenue');
		expect(groups).toContain('Taxes');
		expect(groups[groups.length - 1]).toBe('Adjustments');
	});

	it('carries the Total Sales and Charges and Total Taxes rows', () => {
		expect(upper.some((r) => r.item === 'Total Sales and Charges')).toBe(true);
		expect(upper.some((r) => r.item === 'Total Taxes')).toBe(true);
	});

	it('totals to sales + taxes + adjustments', async () => {
		const sales = upper.find((r) => r.item === 'Total Sales and Charges')!.amount;
		const taxes = upper.find((r) => r.item === 'Total Taxes')!.amount;
		const adjustments = upper
			.filter((r) => r.group_name === 'Adjustments')
			.reduce((s, r) => s + Number(r.amount), 0);
		const total = await rpc<number>('report_dcar_total', { p_date: fx.arrival });
		expect(Number(total)).toBeCloseTo(Number(sales) + Number(taxes) + adjustments, 2);
	});
});
