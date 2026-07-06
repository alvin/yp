// Story: spec/features/keep-one-primary-guest-per-reservation.feature

import { describe, expect, it } from 'vitest';
import { makeReservation, rpc, staffClient, uid, unwrap } from '../helpers/db';

async function activeGuests(reservationid: number) {
	const client = await staffClient();
	return unwrap(
		await client
			.from('reservation_guests')
			.select('reservationguestid, primaryguest, percentageofbill, checkindate, checkoutdate')
			.eq('reservationid', reservationid)
			.eq('rgarchive', false)
	) as {
		reservationguestid: number;
		primaryguest: boolean;
		percentageofbill: number;
		checkindate: string;
		checkoutdate: string;
	}[];
}

describe('keep one primary guest per reservation', () => {
	it('keeps exactly one active primary guest', async () => {
		const fx = await makeReservation();
		const other = await rpc<number>('create_guest', { p_lastname: `ZZCo-${uid()}` });
		await rpc('add_reservation_guest', {
			p_reservationid: fx.reservationid,
			p_guestid: other,
			p_primaryguest: false
		});
		const rgs = await activeGuests(fx.reservationid);
		expect(rgs.filter((g) => g.primaryguest)).toHaveLength(1);
	});

	it('demotes the previous primary when another becomes primary', async () => {
		const fx = await makeReservation();
		const other = await rpc<number>('create_guest', { p_lastname: `ZZCo-${uid()}` });
		const rgid2 = await rpc<number>('add_reservation_guest', {
			p_reservationid: fx.reservationid,
			p_guestid: other,
			p_primaryguest: true
		});
		const rgs = await activeGuests(fx.reservationid);
		const primary = rgs.filter((g) => g.primaryguest);
		expect(primary).toHaveLength(1);
		expect(primary[0].reservationguestid).toBe(rgid2);
	});

	it('inherits check-in/out dates from the reservation', async () => {
		const fx = await makeReservation();
		const other = await rpc<number>('create_guest', { p_lastname: `ZZCo-${uid()}` });
		await rpc('add_reservation_guest', { p_reservationid: fx.reservationid, p_guestid: other });
		const rgs = await activeGuests(fx.reservationid);
		for (const rg of rgs) {
			expect(rg.checkindate.slice(0, 10)).toBe(fx.arrival);
			expect(rg.checkoutdate.slice(0, 10)).toBe(fx.departure);
		}
	});

	it('gives the first guest one hundred percent of the bill', async () => {
		const fx = await makeReservation();
		const rgs = await activeGuests(fx.reservationid);
		expect(rgs.find((g) => g.primaryguest)?.percentageofbill).toBe(100);
	});
});
