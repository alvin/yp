// Story: spec/features/run-all-fields-search.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, uid, type Fixture } from '../helpers/db';

interface AllFieldsRow {
	guestid: number;
	reservationid: number | null;
	resnumber: number | null;
	guest_name: string;
	matched_on: string;
	detail: string;
}

let guestid: number;
let fx: Fixture;

beforeAll(async () => {
	guestid = await rpc<number>('create_guest', {
		p_lastname: `ZZAll-${uid()}`,
		p_primaryphone: '(250) 555-0199',
		p_address: '42 Unique Test Lane'
	});
	fx = await makeReservation();
});

describe('run all-fields search', () => {
	it('finds a guest from a phone-number fragment entered by the office', async () => {
		const rows = await rpc<AllFieldsRow[]>('search_all_fields', { p_query: '555-0199' });
		const hit = rows.find((r) => r.guestid === guestid);
		expect(hit).toBeDefined();
		expect(hit!.matched_on).toBe('primary phone');
	});

	it('matches details beyond name or reservation number, such as the address', async () => {
		const rows = await rpc<AllFieldsRow[]>('search_all_fields', { p_query: 'Unique Test Lane' });
		const hit = rows.find((r) => r.guestid === guestid);
		expect(hit).toBeDefined();
		expect(hit!.matched_on).toBe('address');
		expect(hit!.detail).toContain('42 Unique Test Lane');
	});

	it('returns an openable reservation for a reservation-number match', async () => {
		const rows = await rpc<AllFieldsRow[]>('search_all_fields', {
			p_query: String(fx.resnumber)
		});
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit).toBeDefined();
		expect(hit!.matched_on).toBe('reservation number');
		// The row carries the ids the screen needs to open the reservation.
		expect(hit!.reservationid).toBe(fx.reservationid);
		expect(hit!.guest_name).toContain(fx.lastname);
	});
});
