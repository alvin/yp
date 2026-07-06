// Story: spec/features/print-cancellation-notices.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: 'Deposit (Received)',
		p_paymenttype: 'Visa',
		p_amount: 110,
		p_paymentdate: fx.arrival
	});
	await rpc('cancel_reservation', {
		p_reservationid: fx.reservationid,
		p_date: fx.arrival,
		p_deposit_handling: 'refund'
	});
});

describe('print cancellation notices', () => {
	it('queues notices for reservations cancelled on the day', async () => {
		const rows = await rpc<{ resnumber: number }[]>('report_guest_document_queue', {
			p_document: 'cancellation_notice',
			p_date: fx.arrival
		});
		expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(true);
	});

	it('renders the notice with the cancellation date and deposit outcome', async () => {
		const notice = (
			await rpc<Record<string, unknown>[]>('report_cancellation_notice', {
				p_reservationid: fx.reservationid
			})
		)[0];
		expect(notice.date_cancelled).toBe(fx.arrival);
		expect(Number(notice.deposit_received_amount)).toBe(110);
		expect(notice.deposit_outcome_category).toBe('Deposit (Refund)');
	});

	it('lists the day’s cancellations for review', async () => {
		const rows = await rpc<{ resnumber: number }[]>('report_cancellation_list', {
			p_date: fx.arrival
		});
		expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(true);
	});
});
