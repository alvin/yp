// Story: spec/features/include-second-reservation-name-in-guest-search.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, uid, type Fixture } from '../helpers/db';

interface NameRow {
	guestid: number;
	guest_name: string;
	guestlastname: string;
	match_kind: 'name' | 'shared reservation';
	other_names: string | null;
}

function search(query: string): Promise<NameRow[]> {
	return rpc<NameRow[]>('search_guests_by_name', { p_query: query });
}

let fx: Fixture; // booked under the first partner's name
let partnerLast: string;
let partnerId: number;

beforeAll(async () => {
	const u = uid();
	fx = await makeReservation({ lastname: `ZZBooked${u}`, firstname: 'Karen', roomid: null });
	partnerLast = `ZZPartner${u}`;
	partnerId = await rpc<number>('create_guest', {
		p_lastname: partnerLast,
		p_firstname: 'John'
	});
	// The second name on the stay — partners, or a second surname.
	await rpc<number>('add_reservation_guest', {
		p_reservationid: fx.reservationid,
		p_guestid: partnerId
	});
});

describe('include second reservation name in guest search', () => {
	it('returns the party when the second name on the stay is searched', async () => {
		const rows = await search(partnerLast);
		const ids = rows.map((r) => r.guestid);
		expect(ids).toContain(partnerId);
		// The name the booking is actually filed under comes back too.
		expect(ids).toContain(fx.guestid);
	});

	it('returns the party when the name the booking is filed under is searched', async () => {
		const ids = (await search(fx.lastname)).map((r) => r.guestid);
		expect(ids).toContain(fx.guestid);
		expect(ids).toContain(partnerId);
	});

	it('marks a guest reached through the other name on the stay', async () => {
		const rows = await search(partnerLast);
		expect(rows.find((r) => r.guestid === partnerId)!.match_kind).toBe('name');
		expect(rows.find((r) => r.guestid === fx.guestid)!.match_kind).toBe('shared reservation');
	});

	it('lists direct name matches before names reached through a shared stay', async () => {
		const rows = await search(partnerLast);
		const direct = rows.findIndex((r) => r.guestid === partnerId);
		const shared = rows.findIndex((r) => r.guestid === fx.guestid);
		expect(direct).toBeLessThan(shared);
		// No 'name' match may appear after a 'shared reservation' one.
		const firstShared = rows.findIndex((r) => r.match_kind === 'shared reservation');
		expect(rows.slice(firstShared).every((r) => r.match_kind === 'shared reservation')).toBe(true);
	});

	it('shows the other names each match is booked with', async () => {
		const rows = await search(partnerLast);
		expect(rows.find((r) => r.guestid === partnerId)!.other_names).toContain(fx.lastname);
		expect(rows.find((r) => r.guestid === fx.guestid)!.other_names).toContain(partnerLast);
	});
});
