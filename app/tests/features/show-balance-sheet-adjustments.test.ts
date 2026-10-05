// Story: spec/features/show-balance-sheet-adjustments.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, type Fixture } from '../helpers/db';

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

type UpperRow = { group_name: string; item: string; amount: number };

describe('show balance-sheet adjustments — applied at check-out', () => {
	it('applies the deposit still held on the check-out day and takes it off', async () => {
		// Received 100, refunded 40: 60 is still held when the guest checks out.
		const upper = await rpc<UpperRow[]>('report_dcar_upper', { p_date: fx.departure });
		expect(Number(upper.find((r) => r.item === 'Deposit (Applied)')?.amount)).toBe(-60);
	});

	it('lists the stay in the Deposits Applied appendix, agreeing with the line', async () => {
		const rows = await rpc<{ resnumber: number; payment_type: string; pymt_cdn: number }[]>(
			'report_deposits_applied',
			{ p_date: fx.departure }
		);
		expect(rows.map((r) => [r.resnumber, r.payment_type, Number(r.pymt_cdn)])).toEqual([
			[fx.resnumber, 'Visa', 60]
		]);
	});
});

describe('show balance-sheet adjustments — a deposit kept', () => {
	it('is the day’s revenue on a Cancellation line, and comes off as Deposit (Kept)', async () => {
		const kept = await makeReservation();
		await rpc('record_payment', {
			p_reservationguestid: kept.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: 'Visa',
			p_amount: 50,
			p_paymentdate: kept.arrival
		});
		const day = addDays(kept.arrival, 1);
		await rpc('cancel_reservation', {
			p_reservationid: kept.reservationid,
			p_date: day,
			p_deposit_handling: 'keep'
		});
		const upper = await rpc<UpperRow[]>('report_dcar_upper', { p_date: day });
		expect(
			Number(upper.find((r) => r.group_name === 'Revenue' && r.item === 'Cancellation')?.amount)
		).toBe(50);
		expect(Number(upper.find((r) => r.item === 'Deposit (Kept)')?.amount)).toBe(-50);
		expect(Number(await rpc('report_dcar_total', { p_date: day }))).toBe(0);
	});
});

describe('show balance-sheet adjustments — settled without money', () => {
	it('takes a gift certificate and a bill sent to accounts off the total, not into receipts', async () => {
		const stay = await makeReservation();
		for (const [category, type, amount] of [
			['Gift Certificate Received', 'Gift Certificate', 30],
			['A/R (Sent To Accounts)', 'None (Sent to A/R)', 20]
		] as const) {
			await rpc('record_payment', {
				p_reservationguestid: stay.reservationguestid,
				p_paymentcategory: category,
				p_paymenttype: type,
				p_amount: amount,
				p_paymentdate: stay.arrival
			});
		}
		const upper = await rpc<UpperRow[]>('report_dcar_upper', { p_date: stay.arrival });
		expect(Number(upper.find((r) => r.item === 'Gift Certificate Received')?.amount)).toBe(-30);
		expect(Number(upper.find((r) => r.item === 'A/R (Sent To Accounts)')?.amount)).toBe(-20);
		expect(Number(await rpc('report_dcar_total', { p_date: stay.arrival }))).toBe(-50);
		expect(Number(await rpc('report_dcar_receipts_total', { p_date: stay.arrival }))).toBe(0);
	});
});
