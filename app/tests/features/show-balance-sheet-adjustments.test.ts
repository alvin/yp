// Story: spec/features/show-balance-sheet-adjustments.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, cancel, dcarLine, makeReservation, pay, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	await pay(fx, 'Deposit (Received)', 100);
	await pay(fx, 'Deposit (Refund)', 40);
	await pay(fx, 'Prepayment (Received)', 70, { type: 'Cheque' });
});

const adjustment = (date: string, item: string) => dcarLine(date, item, 'Adjustments');

describe('show balance-sheet adjustments', () => {
	it('carries the money received and refunded on adjustment lines of their own', async () => {
		expect(await adjustment(fx.arrival, 'Deposit (Received)')).toBe(100);
		expect(await adjustment(fx.arrival, 'Deposit (Refund)')).toBe(-40);
		expect(await adjustment(fx.arrival, 'Prepayment (Received)')).toBe(70);
	});

	it('adds what was received to the day’s total and takes the refund off', async () => {
		expect(Number(await rpc('report_dcar_total', { p_date: fx.arrival }))).toBe(130);
	});
});

describe('show balance-sheet adjustments — applied at check-out', () => {
	it('applies the deposit and prepayment still held on the check-out day and takes them off', async () => {
		// Deposit received 100, refunded 40: 60 is still held when the guest checks out.
		expect(await adjustment(fx.departure, 'Deposit (Applied)')).toBe(-60);
		expect(await adjustment(fx.departure, 'Prepayment (Applied)')).toBe(-70);
		expect(Number(await rpc('report_dcar_total', { p_date: fx.departure }))).toBe(-130);
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
		await pay(kept, 'Deposit (Received)', 50);
		const day = addDays(kept.arrival, 1);
		await cancel(kept, 'keep', day);
		expect(await dcarLine(day, 'Cancellation', 'Revenue')).toBe(50);
		expect(await adjustment(day, 'Deposit (Kept)')).toBe(-50);
	});
});

describe('show balance-sheet adjustments — settled without money', () => {
	it('takes a gift certificate and a bill sent to accounts off the total, not into receipts', async () => {
		const stay = await makeReservation();
		await pay(stay, 'Gift Certificate Received', 30, { type: 'Gift Certificate' });
		await pay(stay, 'A/R (Sent To Accounts)', 20, { type: 'None (Sent to A/R)' });
		expect(await adjustment(stay.arrival, 'Gift Certificate Received')).toBe(-30);
		expect(await adjustment(stay.arrival, 'A/R (Sent To Accounts)')).toBe(-20);
		expect(Number(await rpc('report_dcar_total', { p_date: stay.arrival }))).toBe(-50);
		expect(Number(await rpc('report_dcar_receipts_total', { p_date: stay.arrival }))).toBe(0);
	});
});
