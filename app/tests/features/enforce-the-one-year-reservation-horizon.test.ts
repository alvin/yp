// Story: spec/features/enforce-the-one-year-reservation-horizon.feature

import { describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, staffClient, todayISO, uid, unwrap } from '../helpers/db';

const today = todayISO();

/** The arrival and departure on file for a reservation number. */
async function stored(resnumber: number): Promise<[string, string]> {
	const [row] = await rpc<{ resarrivaldate: string; resdeparturedate: string }[]>('find_reservation', {
		p_resnumber: resnumber
	});
	return [row.resarrivaldate.slice(0, 10), row.resdeparturedate.slice(0, 10)];
}

describe('enforce the one-year reservation horizon', () => {
	it('rejects an arrival more than one year and a week ahead', async () => {
		const guestid = await rpc<number>('create_guest', { p_lastname: `ZZHorizon-${uid()}` });
		await expect(
			rpc('create_reservation', {
				p_guestid: guestid,
				p_arrival: addDays(today, 373),
				p_departure: addDays(today, 375),
				p_bookedby: 'QA'
			})
		).rejects.toThrow(/one year/i);
	});

	it('rejects a direct database edit past the horizon too', async () => {
		const fx = await makeReservation({ arrival: today, nights: 2 });
		const client = await staffClient();
		const { error } = await client
			.from('reservations')
			.update({ resarrivaldate: addDays(today, 500), resdeparturedate: addDays(today, 502) })
			.eq('reservationid', fx.reservationid);
		expect(error?.message).toMatch(/one year/i);
		expect(await stored(fx.resnumber)).toEqual([today, addDays(today, 2)]);
	});

	it('saves a reservation arriving within the year', async () => {
		const fx = await makeReservation({ arrival: addDays(today, 300), nights: 3 });
		expect(await stored(fx.resnumber)).toEqual([addDays(today, 300), addDays(today, 303)]);
	});

	it('allows the week of grace, so the same week next season can be booked', async () => {
		// 52 weeks on from a stay a few days out: past a bare year, inside the grace.
		const fx = await makeReservation({ arrival: addDays(today, 370), nights: 3 });
		expect((await stored(fx.resnumber))[0]).toBe(addDays(today, 370));
	});

	it('checks the arrival date only, so a stay may run past the horizon', async () => {
		const fx = await makeReservation({ arrival: addDays(today, 370), departure: addDays(today, 420) });
		expect(await stored(fx.resnumber)).toEqual([addDays(today, 370), addDays(today, 420)]);
	});

	it('leaves historical reservations alone, edits to them included', async () => {
		const fx = await makeReservation();
		const client = await staffClient();
		unwrap(
			await client
				.from('reservations')
				.update({ resdeparturedate: addDays(fx.departure, 1) })
				.eq('reservationid', fx.reservationid)
				.select('reservationid')
		);
		expect(await stored(fx.resnumber)).toEqual([fx.arrival, addDays(fx.departure, 1)]);
	});
});
