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
		expect(['In House', 'Arrive Today', 'Depart Today', 'Move In']).toContain(
			rows.find((r) => r.resnumber === fx.resnumber)?.status
		);
	});

	it('prints only report-facing housekeeping instructions', async () => {
		const rows = await rpc<Record<string, unknown>[]>('report_housekeeping', { p_date: mid });
		const json = JSON.stringify(rows);
		expect(json).toContain(`Print ${marker}`);
		expect(json).not.toContain(`OFFICE-${marker}`);
	});

	it('keeps note dates with the notes', async () => {
		const rows = await rpc<{ resnumber: number; note_date: string | null }[]>(
			'report_housekeeping',
			{ p_date: mid }
		);
		expect(rows.find((r) => r.resnumber === fx.resnumber)?.note_date).toBe(mid);
	});
});
