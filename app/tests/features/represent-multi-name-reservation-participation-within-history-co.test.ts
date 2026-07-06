// Story: spec/features/represent-multi-name-reservation-participation-within-history-co.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, uid, type Fixture } from '../helpers/db';

let fx: Fixture;
let g2: number;

beforeAll(async () => {
	fx = await makeReservation();
	g2 = await rpc<number>('create_guest', { p_lastname: `ZZShare-${uid()}`, p_firstname: 'Sam' });
	await rpc('add_reservation_guest', { p_reservationid: fx.reservationid, p_guestid: g2 });
});

describe('represent multi-name reservation participation within history context', () => {
	it('shows the shared stay in the second guest’s history', async () => {
		const rows = await rpc<{ resnumber: number }[]>('guest_history', { p_guestid: g2 });
		expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(true);
	});

	it('carries the party size so the guest is not implied to be alone', async () => {
		const rows = await rpc<{ resnumber: number; party_size: number }[]>('guest_history', {
			p_guestid: g2
		});
		expect(rows.find((r) => r.resnumber === fx.resnumber)?.party_size).toBe(2);
	});

	it('names the co-guests sharing the booking', async () => {
		const rows = await rpc<{ resnumber: number; co_guests: string | null }[]>('guest_history', {
			p_guestid: g2
		});
		expect(rows.find((r) => r.resnumber === fx.resnumber)?.co_guests).toContain(fx.lastname);
	});
});
