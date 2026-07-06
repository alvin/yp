// Story: spec/features/segment-reservation-history-into-future-present-in-house-and-pas.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, todayISO, uid } from '../helpers/db';

let guestid: number;
let pastRes: number;
let presentRes: number;
let futureRes: number;

beforeAll(async () => {
	const past = await makeReservation({ lastname: `ZZSeg-${uid()}` });
	guestid = past.guestid;
	pastRes = past.resnumber;
	const today = todayISO();
	const present = await rpc<{ resnumber: number }[]>('create_reservation', {
		p_guestid: guestid,
		p_arrival: addDays(today, -1),
		p_departure: addDays(today, 1),
		p_bookedby: 'QA'
	});
	presentRes = present[0].resnumber;
	const future = await rpc<{ resnumber: number }[]>('create_reservation', {
		p_guestid: guestid,
		p_arrival: addDays(today, 60),
		p_departure: addDays(today, 63),
		p_bookedby: 'QA'
	});
	futureRes = future[0].resnumber;
});

describe('segment reservation history into future, present/in-house, and past', () => {
	it('buckets the upcoming stay as future', async () => {
		const rows = await rpc<{ resnumber: number; bucket: string }[]>('guest_history', {
			p_guestid: guestid
		});
		expect(rows.find((r) => r.resnumber === futureRes)?.bucket).toBe('future');
	});

	it('buckets the active stay as present', async () => {
		const rows = await rpc<{ resnumber: number; bucket: string }[]>('guest_history', {
			p_guestid: guestid
		});
		expect(rows.find((r) => r.resnumber === presentRes)?.bucket).toBe('present');
	});

	it('buckets completed stays as past', async () => {
		const rows = await rpc<{ resnumber: number; bucket: string }[]>('guest_history', {
			p_guestid: guestid
		});
		expect(rows.find((r) => r.resnumber === pastRes)?.bucket).toBe('past');
	});

	it('orders history with the most recent arrivals first', async () => {
		const rows = await rpc<{ arrival_date: string }[]>('guest_history', { p_guestid: guestid });
		const dates = rows.map((r) => r.arrival_date);
		expect(dates).toEqual([...dates].sort().reverse());
	});
});
