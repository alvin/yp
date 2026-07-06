// Story: spec/features/keep-guest-notes-private.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, uid, type Fixture } from '../helpers/db';

let fx: Fixture;
let secret: string;
let mid: string;

beforeAll(async () => {
	fx = await makeReservation();
	secret = `ZZPRIVATE-${uid()}`;
	mid = addDays(fx.arrival, 1);
	await rpc('set_guest_notes', { p_guestid: fx.guestid, p_notes: secret });
	// Report-feeding notes exist alongside, so reports have content to check.
	await rpc('add_housekeeping_note', {
		p_reservationguestid: fx.reservationguestid,
		p_notes: 'Printable note',
		p_date: mid
	});
});

describe('keep guest notes private', () => {
	it('never prints guest notes on operational reports', async () => {
		for (const fn of ['report_housekeeping', 'report_in_house', 'report_kitchen_meal']) {
			const rows = await rpc<Record<string, unknown>[]>(fn, { p_date: mid });
			expect(JSON.stringify(rows)).not.toContain(secret);
		}
	});

	it('never prints guest notes on guest documents', async () => {
		const conf = await rpc<Record<string, unknown>[]>('report_reservation_confirmation', {
			p_reservationid: fx.reservationid
		});
		const folio = await rpc<Record<string, unknown>[]>('report_check_in_folio', {
			p_reservationid: fx.reservationid
		});
		expect(JSON.stringify(conf)).not.toContain(secret);
		expect(JSON.stringify(folio)).not.toContain(secret);
	});

	it('keeps the notes available on the guest record for the office', async () => {
		const rows = await rpc<{ guestid: number }[]>('search_guests_by_name', {
			p_query: fx.lastname
		});
		expect(rows.some((r) => r.guestid === fx.guestid)).toBe(true);
	});
});
