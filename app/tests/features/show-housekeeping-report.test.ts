// Story: spec/features/show-housekeeping-report.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, type Fixture } from '../helpers/db';

interface HkRow {
	status: string;
	resnumber: number;
	guest: string;
	guest_count: number;
	room: string;
	in_date: string;
	out_date: string;
	note_date: string | null;
	notes: string | null;
}

let fx: Fixture;
let mid: string;
let rows: HkRow[];

beforeAll(async () => {
	fx = await makeReservation();
	mid = addDays(fx.arrival, 1);
	await rpc('add_housekeeping_note', {
		p_reservationguestid: fx.reservationguestid,
		p_notes: 'Twin beds made up',
		p_date: mid
	});
	rows = await rpc('report_housekeeping', { p_date: mid });
});

describe('show housekeeping report', () => {
	it('lists each occupied room with its stay context', () => {
		const mine = rows.find((r) => r.resnumber === fx.resnumber)!;
		expect(mine.guest).toContain(fx.lastname);
		expect(mine.room).toContain(':');
		expect(mine.in_date).toBe(fx.arrival);
		expect(mine.out_date).toBe(fx.departure);
		expect(mine.guest_count).toBeGreaterThan(0);
	});

	it('carries the room status for the day', () => {
		const mine = rows.find((r) => r.resnumber === fx.resnumber)!;
		expect(['In House', 'Arrive Today', 'Depart Today', 'Move In']).toContain(mine.status);
	});

	it('shows the latest housekeeping note with its date', () => {
		const mine = rows.find((r) => r.resnumber === fx.resnumber)!;
		expect(mine.notes).toBe('Twin beds made up');
		expect(mine.note_date).toBe(mid);
	});
});
