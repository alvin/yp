// Story: spec/features/generate-guest-document-queues-through-shared-queue-service-by-o.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

let arriving: Fixture;
let cancelled: Fixture;

beforeAll(async () => {
	arriving = await makeReservation();
	await rpc('confirm_reservation', { p_reservationid: arriving.reservationid, p_date: arriving.arrival });
	cancelled = await makeReservation();
	await rpc('cancel_reservation', {
		p_reservationid: cancelled.reservationid,
		p_date: cancelled.arrival,
		p_deposit_handling: 'none'
	});
});

async function queue(doc: string, date: string) {
	return rpc<{ document_type: string; resnumber: number; target_date: string; reason: string }[]>(
		'report_guest_document_queue',
		{ p_document: doc, p_date: date }
	);
}

describe('generate guest document queues through the shared queue service by occasion', () => {
	it('queues confirmations for reservations confirmed on the day', async () => {
		const rows = await queue('confirmation', arriving.arrival);
		const mine = rows.find((r) => r.resnumber === arriving.resnumber)!;
		expect(mine.reason).toMatch(/booked or confirmed/i);
		expect(mine.target_date).toBe(arriving.arrival);
	});

	it('queues check-in folios for arrivals on the day', async () => {
		const rows = await queue('check_in_folio', arriving.arrival);
		expect(rows.find((r) => r.resnumber === arriving.resnumber)?.reason).toMatch(/arrival/i);
	});

	it('queues check-out bills for departures on the day', async () => {
		const rows = await queue('checkout_bill', arriving.departure);
		expect(rows.find((r) => r.resnumber === arriving.resnumber)?.reason).toMatch(/departure/i);
	});

	it('queues cancellation notices for cancellations on the day', async () => {
		const rows = await queue('cancellation_notice', cancelled.arrival);
		expect(rows.find((r) => r.resnumber === cancelled.resnumber)?.reason).toMatch(/cancelled/i);
	});

	it('serves every document type through one shared queue shape', async () => {
		const rows = await queue('check_in_folio', arriving.arrival);
		const mine = rows.find((r) => r.resnumber === arriving.resnumber)!;
		expect(mine.document_type).toBe('check_in_folio');
		expect(mine.target_date).toBe(arriving.arrival);
	});
});
