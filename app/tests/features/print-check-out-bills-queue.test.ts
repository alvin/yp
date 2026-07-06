// Story: spec/features/print-check-out-bills-queue.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('post_room_nights', {
		p_reservationguestid: fx.reservationguestid,
		p_roomid: (await rpc<{ roomid: number }[]>('room_directory'))[0].roomid,
		p_occupancyin: fx.arrival,
		p_occupancyout: fx.departure,
		p_rate: 120,
		p_transdate: fx.arrival
	});
});

describe('print check-out bills queue', () => {
	it('queues bills by the check-out day', async () => {
		const rows = await rpc<{ resnumber: number; reason: string }[]>(
			'report_guest_document_queue',
			{ p_document: 'checkout_bill', p_date: fx.departure }
		);
		expect(rows.find((r) => r.resnumber === fx.resnumber)?.reason).toMatch(/departure/i);
	});

	it('renders the bill for each queued reservation', async () => {
		const header = (
			await rpc<{ resnumber: number; balance_owing: number }[]>('report_checkout_bill_header', {
				p_reservationid: fx.reservationid
			})
		)[0];
		expect(header.resnumber).toBe(fx.resnumber);
		expect(Number(header.balance_owing)).toBeGreaterThan(0);
		const lines = await rpc<{ sort_group: string }[]>('report_checkout_bill_lines', {
			p_reservationid: fx.reservationid
		});
		expect(lines.some((l) => l.sort_group === 'charges')).toBe(true);
	});
});
