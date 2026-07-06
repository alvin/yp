// Story: spec/features/print-check-in-folios-for-a-selected-day.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: 'Deposit (Received)',
		p_paymenttype: 'Visa',
		p_amount: 75,
		p_paymentdate: fx.arrival
	});
});

describe('print check-in folios for a selected day', () => {
	it('queues folios for guests arriving on the selected day', async () => {
		const rows = await rpc<{ resnumber: number }[]>('report_guest_document_queue', {
			p_document: 'check_in_folio',
			p_date: fx.arrival
		});
		expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(true);
	});

	it('renders the folio with room, dates, party, and deposit on file', async () => {
		const folio = (
			await rpc<Record<string, unknown>[]>('report_check_in_folio', {
				p_reservationid: fx.reservationid
			})
		)[0];
		expect(folio.room).toBeTruthy();
		expect(folio.arrival_date).toBe(fx.arrival);
		expect(folio.departure_date).toBe(fx.departure);
		expect(Number(folio.guest_count)).toBeGreaterThan(0);
		expect(Number(folio.deposit_amount)).toBe(75);
	});

	it('does not queue folios for other days', async () => {
		const rows = await rpc<{ resnumber: number }[]>('report_guest_document_queue', {
			p_document: 'check_in_folio',
			p_date: fx.departure
		});
		expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(false);
	});
});
