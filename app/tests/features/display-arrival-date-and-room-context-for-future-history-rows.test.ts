// Story: spec/features/display-arrival-date-and-room-context-for-future-history-rows.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, todayISO, type Fixture } from '../helpers/db';

let fx: Fixture;
let futureRes: number;
let arrival: string;

beforeAll(async () => {
	fx = await makeReservation();
	arrival = addDays(todayISO(), 45);
	const created = await rpc<{ resnumber: number }[]>('create_reservation', {
		p_guestid: fx.guestid,
		p_arrival: arrival,
		p_departure: addDays(arrival, 3),
		p_bookedby: 'QA',
		p_roomid: (await rpc<{ roomid: number }[]>('room_directory'))[0].roomid
	});
	futureRes = created[0].resnumber;
});

describe('display arrival date and room context for future history rows', () => {
	it('carries the arrival date on future rows', async () => {
		const rows = await rpc<{ resnumber: number; arrival_date: string; bucket: string }[]>(
			'guest_history',
			{ p_guestid: fx.guestid }
		);
		const row = rows.find((r) => r.resnumber === futureRes);
		expect(row?.bucket).toBe('future');
		expect(row?.arrival_date).toBe(arrival);
	});

	it('carries the room context on future rows', async () => {
		const rows = await rpc<{ resnumber: number; rooms: string | null }[]>('guest_history', {
			p_guestid: fx.guestid
		});
		expect(rows.find((r) => r.resnumber === futureRes)?.rooms).toBeTruthy();
	});
});
