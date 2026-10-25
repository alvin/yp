// Story: spec/features/print-cancellation-notices.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, cancel, makeReservation, pay, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;
let cancelledOn: string;

const notices = async (date: string) =>
	(
		await rpc<{ resnumber: number }[]>('report_guest_document_queue', {
			p_document: 'cancellation_notice',
			p_date: date
		})
	).map((r) => r.resnumber);

beforeAll(async () => {
	fx = await makeReservation();
	await pay(fx, 'Deposit (Received)', 110, { date: addDays(fx.arrival, -3) });
	// Cancelled ahead of the stay: the notice belongs to that day, not the arrival.
	cancelledOn = addDays(fx.arrival, -2);
	await cancel(fx, 'refund', cancelledOn);
});

describe('print cancellation notices', () => {
	it('gives the day of the cancellation its notice, and no other day', async () => {
		expect(await notices(cancelledOn)).toEqual([fx.resnumber]);
		expect(await notices(fx.arrival)).toEqual([]);
		expect(await notices(addDays(cancelledOn, 1))).toEqual([]);
	});

	it('carries the cancellation date, the deposit received and what became of it', async () => {
		const [notice] = await rpc<Record<string, unknown>[]>('report_cancellation_notice', {
			p_reservationid: fx.reservationid
		});
		expect(notice.date_cancelled).toBe(cancelledOn);
		expect(Number(notice.deposit_received_amount)).toBe(110);
		expect(notice.deposit_outcome_category).toBe('Deposit (Refund)');
	});

	it("lists the day's cancellations on the Cancellation report", async () => {
		const rows = await rpc<{ resnumber: number }[]>('report_cancellation_list', {
			p_date: cancelledOn
		});
		expect(rows.map((r) => r.resnumber)).toEqual([fx.resnumber]);
	});
});
