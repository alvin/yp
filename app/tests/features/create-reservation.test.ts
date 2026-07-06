// Story: spec/features/create-reservation.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, firstRoomId, isolatedDate, rpc, uid } from '../helpers/db';

interface ReservationSummary {
	reservationid: number;
	resnumber: number;
	resarrivaldate: string;
	resdeparturedate: string;
	numnights: number;
	numadults: number;
	numchildren: number;
	bedtype: string;
	resbookedby: string;
	rescancelled: boolean;
	primary_guestid: number;
	guestlastname: string;
}

describe('create reservation', () => {
	let guestid: number;
	let lastname: string;
	let arrival: string;
	let departure: string;
	let created: { reservationid: number; resnumber: number; reservationguestid: number };

	beforeAll(async () => {
		lastname = `ZZCreate-${uid()}`;
		arrival = isolatedDate();
		departure = addDays(arrival, 4);
		guestid = await rpc<number>('create_guest', {
			p_lastname: lastname,
			p_firstname: 'Test',
			p_city: 'Ladysmith',
			p_region: 'BC'
		});
		const rows = await rpc<
			{ reservationid: number; resnumber: number; reservationguestid: number }[]
		>('create_reservation', {
			p_guestid: guestid,
			p_arrival: arrival,
			p_departure: departure,
			p_bookedby: 'QA',
			p_numadults: 2,
			p_numchildren: 1,
			p_bedtype: 'Twin',
			p_roomid: await firstRoomId()
		});
		created = rows[0];
	});

	async function summary(): Promise<ReservationSummary> {
		const rows = await rpc<ReservationSummary[]>('find_reservation', {
			p_resnumber: created.resnumber
		});
		return rows[0];
	}

	it('begins a new reservation and returns its identifiers', () => {
		expect(created.reservationid).toBeGreaterThan(0);
		expect(created.resnumber).toBeGreaterThan(0);
		expect(created.reservationguestid).toBeGreaterThan(0);
	});

	it('captures the stay details needed to hold the booking', async () => {
		const s = await summary();
		expect(s.numadults).toBe(2);
		expect(s.numchildren).toBe(1);
		expect(s.bedtype).toBe('Twin');
		expect(s.resbookedby).toBe('QA');
		expect(s.numnights).toBe(4);
	});

	it('associates the reservation with the correct guest and dates', async () => {
		const s = await summary();
		expect(s.primary_guestid).toBe(guestid);
		expect(s.guestlastname).toBe(lastname);
		expect(s.resarrivaldate.slice(0, 10)).toBe(arrival);
		expect(s.resdeparturedate.slice(0, 10)).toBe(departure);
	});

	it('lets the clerk review the reservation by its number before moving on', async () => {
		const rows = await rpc<ReservationSummary[]>('find_reservation', {
			p_resnumber: created.resnumber
		});
		expect(rows).toHaveLength(1);
		expect(rows[0].reservationid).toBe(created.reservationid);
		expect(rows[0].rescancelled).toBe(false);
	});
});
