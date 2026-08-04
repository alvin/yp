// Story: spec/features/store-notes-as-plain-text.feature

import { describe, expect, it } from 'vitest';
import { makeReservation, rpc, staffClient, uid, unwrap } from '../helpers/db';

// One <div> per line, decorative formatting, and &nbsp; padding — exactly the
// shape the lodge's Access memo fields arrive in.
const LEGACY = [
	'<div><strong><em><u>3/16/24 rebook for 2025</u></em></strong> </div>',
	'',
	'<div>$70 deposit transferred fron cxl&#39;d res</div>',
	'',
	'<div>&nbsp;9/16/21 rolled to 2022 as per Gail &amp; Sons</div>',
	'',
	'<div>&nbsp;</div>'
].join('\n');

async function guestNotes(guestid: number): Promise<string | null> {
	const client = await staffClient();
	const rows = unwrap(
		await client.from('guests').select('guestnotes').eq('guestid', guestid)
	) as { guestnotes: string | null }[];
	return rows[0].guestnotes;
}

describe('store notes as plain text', () => {
	it('stores notes as plain lines, without the old formatting markup', async () => {
		const guestid = await rpc<number>('create_guest', { p_lastname: `ZZPlain-${uid()}` });
		await rpc('set_guest_notes', { p_guestid: guestid, p_notes: LEGACY });
		const stored = await guestNotes(guestid);
		expect(stored).not.toMatch(/<[a-zA-Z/]/);
		expect(stored).not.toMatch(/&(nbsp|amp|quot|lt|gt);/);
	});

	it('keeps every note line, in order and wording', async () => {
		const guestid = await rpc<number>('create_guest', { p_lastname: `ZZPlain-${uid()}` });
		await rpc('set_guest_notes', { p_guestid: guestid, p_notes: LEGACY });
		const lines = (await guestNotes(guestid))!.split('\n').filter((l) => l.trim());
		expect(lines).toEqual([
			'3/16/24 rebook for 2025',
			"$70 deposit transferred fron cxl'd res",
			'9/16/21 rolled to 2022 as per Gail & Sons'
		]);
	});

	it('stores notes as plain text however they are entered', async () => {
		// Written straight to the table, as the Supabase table editor would.
		const fx = await makeReservation();
		const client = await staffClient();
		unwrap(
			await client
				.from('reservations')
				.update({ resnotes: '<div>typed&nbsp;in Supabase</div>' })
				.eq('reservationid', fx.reservationid)
				.select()
		);
		const rows = unwrap(
			await client.from('reservations').select('resnotes').eq('reservationid', fx.reservationid)
		) as { resnotes: string }[];
		expect(rows[0].resnotes).toBe('typed in Supabase');
	});

	it('leaves ordinary punctuation untouched', async () => {
		const guestid = await rpc<number>('create_guest', { p_lastname: `ZZPlain-${uid()}` });
		const plain = 'Smith & Jones — 3 nights, "quiet room" <please>';
		await rpc('set_guest_notes', { p_guestid: guestid, p_notes: plain });
		expect(await guestNotes(guestid)).toBe(plain);
	});
});
