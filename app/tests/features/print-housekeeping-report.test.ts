// Story: spec/features/print-housekeeping-report.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, uid, type Fixture } from '../helpers/db';

let fx: Fixture;
let mid: string;
let marker: string;

beforeAll(async () => {
	fx = await makeReservation();
	mid = addDays(fx.arrival, 1);
	marker = `HK-${uid()}`;
	await rpc('set_guest_notes', { p_guestid: fx.guestid, p_notes: `OFFICE-${marker}` });
	await rpc('add_housekeeping_note', {
		p_reservationguestid: fx.reservationguestid,
		p_notes: `Print ${marker}`,
		p_date: mid
	});
});

describe('print housekeeping report', () => {
	it('carries room status context for each row', async () => {
		const rows = await rpc<{ resnumber: number; status: string }[]>('report_housekeeping', {
			p_date: mid
		});
		// The day after arrival, mid-stay, in the one room.
		expect(rows.find((r) => r.resnumber === fx.resnumber)?.status).toBe('In House');
	});

	it('prints only report-facing housekeeping instructions', async () => {
		const rows = await rpc<Record<string, unknown>[]>('report_housekeeping', { p_date: mid });
		const json = JSON.stringify(rows);
		expect(json).toContain(`Print ${marker}`);
		expect(json).not.toContain(`OFFICE-${marker}`);
	});
});

describe('print housekeeping report — stay context and notes', () => {
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

	let hkFx: Fixture;
	let hkMid: string;
	let rows: HkRow[];

	beforeAll(async () => {
		hkFx = await makeReservation();
		hkMid = addDays(hkFx.arrival, 1);
		await rpc('add_housekeeping_note', {
			p_reservationguestid: hkFx.reservationguestid,
			p_notes: 'Twin beds made up',
			p_date: hkMid
		});
		rows = await rpc('report_housekeeping', { p_date: hkMid });
	});

	it('lists each occupied room with its stay context', () => {
		const mine = rows.find((r) => r.resnumber === hkFx.resnumber)!;
		expect(mine.guest).toContain(hkFx.lastname);
		expect(mine.room).toContain(':');
		expect(mine.in_date).toBe(hkFx.arrival);
		expect(mine.out_date).toBe(hkFx.departure);
		expect(mine.guest_count).toBeGreaterThan(0);
	});

	it('shows the latest housekeeping note with its date', () => {
		const mine = rows.find((r) => r.resnumber === hkFx.resnumber)!;
		expect(mine.notes).toBe('Twin beds made up');
		expect(mine.note_date).toBe(hkMid);
	});
});
