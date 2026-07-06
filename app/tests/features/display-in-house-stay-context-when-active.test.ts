// Story: spec/features/display-in-house-stay-context-when-active.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, staffClient, todayISO, unwrap, type Fixture } from '../helpers/db';

let fx: Fixture;

beforeAll(async () => {
	// A stay spanning today: arrived yesterday, departs tomorrow.
	fx = await makeReservation({ arrival: addDays(todayISO(), -1), departure: addDays(todayISO(), 1) });
});

describe('display in-house stay context when active', () => {
	it('marks the active stay as present in guest history', async () => {
		const rows = await rpc<{ resnumber: number; bucket: string }[]>('guest_history', {
			p_guestid: fx.guestid
		});
		expect(rows.find((r) => r.resnumber === fx.resnumber)?.bucket).toBe('present');
	});

	it('computes an in-house status for the current occupancy', async () => {
		const client = await staffClient();
		const occ = unwrap(
			await client
				.from('v_occupancy_summary')
				.select('status_today')
				.eq('reservationid', fx.reservationid)
		) as { status_today: string }[];
		expect(['In House', 'Arrive Today', 'Depart Today']).toContain(occ[0].status_today);
	});

	it('lists the stay under an in-house date search for today', async () => {
		const rows = await rpc<{ resnumber: number; match_type: string }[]>('search_by_date', {
			p_date: todayISO(),
			p_mode: 'in_house'
		});
		expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(true);
	});
});
