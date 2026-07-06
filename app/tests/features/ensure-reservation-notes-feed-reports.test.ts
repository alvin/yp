// Story: spec/features/ensure-reservation-notes-feed-reports.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, uid, type Fixture } from '../helpers/db';

let fx: Fixture;
let mid: string;
let marker: string;

beforeAll(async () => {
	fx = await makeReservation();
	mid = addDays(fx.arrival, 1);
	marker = `QA-NOTE-${uid()}`;
	await rpc('add_housekeeping_note', {
		p_reservationguestid: fx.reservationguestid,
		p_notes: `HK ${marker}`,
		p_date: mid
	});
	await rpc('save_kitchen_meal', {
		p_guestid: fx.guestid,
		p_guestdiet: 'Vegetarian',
		p_notes: `KM ${marker}`
	});
	await rpc('update_reservation_guest', {
		p_reservationguestid: fx.reservationguestid,
		p_rgnotes: `RG ${marker}`
	});
	await rpc('set_reservation_notes', { p_reservationid: fx.reservationid, p_notes: `RES ${marker}` });
});

describe('ensure reservation notes feed reports', () => {
	it('feeds housekeeping notes to the housekeeping report', async () => {
		const rows = await rpc<{ resnumber: number; notes: string | null }[]>('report_housekeeping', {
			p_date: mid
		});
		expect(rows.find((r) => r.resnumber === fx.resnumber)?.notes).toContain(`HK ${marker}`);
	});

	it('feeds kitchen notes to the kitchen report', async () => {
		const rows = await rpc<{ resnumber: number; diet_notes: string | null }[]>(
			'report_kitchen_meal',
			{ p_date: mid }
		);
		expect(rows.find((r) => r.resnumber === fx.resnumber)?.diet_notes).toContain(`KM ${marker}`);
	});

	it('feeds request notes to the in-house report', async () => {
		const rows = await rpc<{ resnumber: number; occupancy_notes: string | null }[]>(
			'report_in_house',
			{ p_date: mid }
		);
		expect(rows.find((r) => r.resnumber === fx.resnumber)?.occupancy_notes).toContain(
			`RG ${marker}`
		);
	});

	it('feeds reservation notes to the confirmation slip', async () => {
		const conf = await rpc<{ reservation_notes: string | null }[]>(
			'report_reservation_confirmation',
			{ p_reservationid: fx.reservationid }
		);
		expect(conf[0].reservation_notes).toContain(`RES ${marker}`);
	});
});
