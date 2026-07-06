// Story: spec/features/handle-deposits-on-cancellation.feature

import { describe, expect, it } from 'vitest';
import { makeReservation, rpc, staffClient, unwrap } from '../helpers/db';

async function paymentsFor(rgid: number) {
	const client = await staffClient();
	return unwrap(
		await client
			.from('payments')
			.select('paymentcategory, paymentamount, paymentdate')
			.eq('reservationguestid', rgid)
			.eq('paymentarchive', false)
	) as { paymentcategory: string; paymentamount: number; paymentdate: string }[];
}

describe('handle deposits on cancellation', () => {
	it('refund writes a negative deposit-refund line dated on the cancellation day', async () => {
		const fx = await makeReservation();
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: 'Visa',
			p_amount: 150,
			p_paymentdate: fx.arrival
		});
		await rpc('cancel_reservation', {
			p_reservationid: fx.reservationid,
			p_date: fx.arrival,
			p_deposit_handling: 'refund'
		});
		const pays = await paymentsFor(fx.reservationguestid);
		const refund = pays.find((p) => p.paymentcategory === 'Deposit (Refund)');
		expect(refund?.paymentamount).toBe(-150);
		expect(refund?.paymentdate.slice(0, 10)).toBe(fx.arrival);
		expect(await rpc('reservationguest_deposit_held', { p_reservationguestid: fx.reservationguestid })).toBe(0);
	});

	it('keep writes a deposit-kept line and clears the held deposit', async () => {
		const fx = await makeReservation();
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: 'Visa',
			p_amount: 90,
			p_paymentdate: fx.arrival
		});
		await rpc('cancel_reservation', {
			p_reservationid: fx.reservationid,
			p_date: fx.arrival,
			p_deposit_handling: 'keep'
		});
		const pays = await paymentsFor(fx.reservationguestid);
		expect(pays.find((p) => p.paymentcategory === 'Deposit (Kept)')?.paymentamount).toBe(90);
		expect(await rpc('reservationguest_deposit_held', { p_reservationguestid: fx.reservationguestid })).toBe(0);
	});

	it('keeps daily cash balanced after deposit handling', async () => {
		const fx = await makeReservation();
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: 'Visa',
			p_amount: 120,
			p_paymentdate: fx.arrival
		});
		await rpc('cancel_reservation', {
			p_reservationid: fx.reservationid,
			p_date: fx.arrival,
			p_deposit_handling: 'refund'
		});
		// The fixture's isolated date contains only this activity: received +120,
		// refunded −120 → both DCAR sections net to zero and agree.
		const upper = await rpc<number>('report_dcar_total', { p_date: fx.arrival });
		const lower = await rpc<number>('report_dcar_receipts_total', { p_date: fx.arrival });
		expect(upper).toBe(lower);
	});

	it('records the cancellation flags for staff to review', async () => {
		const fx = await makeReservation();
		await rpc('cancel_reservation', {
			p_reservationid: fx.reservationid,
			p_date: fx.arrival,
			p_deposit_handling: 'none',
			p_notes: 'QA cancellation'
		});
		const client = await staffClient();
		const rows = unwrap(
			await client
				.from('reservations')
				.select('rescancelled, resdatecancelled, resnotes')
				.eq('reservationid', fx.reservationid)
		) as { rescancelled: boolean; resdatecancelled: string; resnotes: string }[];
		expect(rows[0].rescancelled).toBe(true);
		expect(rows[0].resdatecancelled.slice(0, 10)).toBe(fx.arrival);
		expect(rows[0].resnotes).toContain('QA cancellation');
	});
});
