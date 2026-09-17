// Story: spec/features/include-second-reservation-name-in-guest-search.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, uid, type Fixture } from '../helpers/db';

interface NameRow {
	guestid: number;
	guest_name: string;
	guestlastname: string;
	other_names: string | null;
}

function search(query: string): Promise<NameRow[]> {
	return rpc<NameRow[]>('search_guests_by_name', { p_query: query });
}

let fx: Fixture; // booked under the first partner's name
let partnerLast: string;
let partnerId: number;
let doubleLast: string;
let doubleId: number;

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

	// A double surname recorded in one field, the lodge's other way of holding
	// a booking under two names. Guest last names are varchar(25), so the
	// unique tail is trimmed to keep both halves inside it.
	const t = u.slice(-4);
	doubleLast = `ZZDoe${t} ZZRoe${t}`;
	doubleId = await rpc<number>('create_guest', {
		p_lastname: doubleLast,
		p_firstname: 'Sam'
	});
});

describe('include second reservation name in guest search', () => {
	it('finds the person of that name from either name on the stay', async () => {
		expect((await search(partnerLast)).map((r) => r.guestid)).toContain(partnerId);
		expect((await search(fx.lastname)).map((r) => r.guestid)).toContain(fx.guestid);
	});

	it('finds a double surname from either half of it', async () => {
		const [first, second] = doubleLast.split(' ');
		expect((await search(first)).map((r) => r.guestid)).toContain(doubleId);
		expect((await search(second)).map((r) => r.guestid)).toContain(doubleId);
	});

	it('shows the other names each match is booked with', async () => {
		const partner = (await search(partnerLast)).find((r) => r.guestid === partnerId)!;
		expect(partner.other_names).toContain(fx.lastname);
		const booked = (await search(fx.lastname)).find((r) => r.guestid === fx.guestid)!;
		expect(booked.other_names).toContain(partnerLast);
	});

	it('returns the people it names and no one else', async () => {
		// Searching one partner does not drag the other into the list: they are
		// found by their own name, with the stay named beside it.
		const rows = await search(partnerLast);
		expect(rows.map((r) => r.guestid)).not.toContain(fx.guestid);
		for (const r of rows) {
			expect(r.guest_name.toLowerCase()).toContain(partnerLast.toLowerCase());
		}
	});
});
