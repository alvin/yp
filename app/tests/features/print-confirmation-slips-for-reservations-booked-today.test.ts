// Story: spec/features/print-confirmation-slips-for-reservations-booked-today.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, rpc, todayISO, uid } from '../helpers/db';

let resnumber: number;
let reservationid: number;

beforeAll(async () => {
	// Booked right now → booking date is today.
	const guestid = await rpc<number>('create_guest', { p_lastname: `ZZBook-${uid()}` });
	const created = await rpc<{ reservationid: number; resnumber: number }[]>('create_reservation', {
		p_guestid: guestid,
		p_arrival: addDays(todayISO(), 90),
		p_departure: addDays(todayISO(), 93),
		p_bookedby: 'QA'
	});
	resnumber = created[0].resnumber;
	reservationid = created[0].reservationid;
});

describe('print confirmation slips for reservations booked today', () => {
	it('queues the confirmation for the booking day', async () => {
		const rows = await rpc<{ resnumber: number }[]>('report_guest_document_queue', {
			p_document: 'confirmation',
			p_date: todayISO()
		});
		expect(rows.some((r) => r.resnumber === resnumber)).toBe(true);
	});

	it('renders the slip data for printing', async () => {
		const conf = await rpc<{ resnumber: number; date_printed: string }[]>(
			'report_reservation_confirmation',
			{ p_reservationid: reservationid }
		);
		expect(conf[0].resnumber).toBe(resnumber);
		expect(conf[0].date_printed).toBe(todayISO());
	});
});
