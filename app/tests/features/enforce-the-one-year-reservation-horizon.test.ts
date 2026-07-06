// Story: spec/features/enforce-the-one-year-reservation-horizon.feature

import { describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, staffClient, todayISO } from '../helpers/db';

describe('enforce the one-year reservation horizon', () => {
	it('rejects an arrival more than one year past the booking date', async () => {
		const guestid = await rpc<number>('create_guest', { p_lastname: `ZZHorizon-${Date.now()}` });
		await expect(
			rpc('create_reservation', {
				p_guestid: guestid,
				p_arrival: addDays(todayISO(), 400),
				p_departure: addDays(todayISO(), 403),
				p_bookedby: 'QA'
			})
		).rejects.toThrow(/one year/i);
	});

	it('rejects direct database edits past the horizon too', async () => {
		const fx = await makeReservation({ arrival: todayISO(), departure: addDays(todayISO(), 2) });
		const client = await staffClient();
		const { error } = await client
			.from('reservations')
			.update({ resarrivaldate: addDays(todayISO(), 500), resdeparturedate: addDays(todayISO(), 502) })
			.eq('reservationid', fx.reservationid);
		expect(error?.message).toMatch(/one year/i);
	});

	it('saves reservations arriving within one year', async () => {
		const fx = await makeReservation({
			arrival: addDays(todayISO(), 300),
			departure: addDays(todayISO(), 303)
		});
		expect(fx.resnumber).toBeGreaterThan(0);
	});

	it('does not reject historical stays (legacy data)', async () => {
		// Isolated fixture dates are decades in the past; they save fine.
		const fx = await makeReservation();
		expect(fx.reservationid).toBeGreaterThan(0);
	});
});
