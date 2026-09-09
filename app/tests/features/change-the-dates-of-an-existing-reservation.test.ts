// Story: spec/features/change-the-dates-of-an-existing-reservation.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, firstRoomId, makeReservation, rpc, staffClient, unwrap } from '../helpers/db';

interface Summary {
	reservationid: number;
	resnumber: number;
	resarrivaldate: string;
	resdeparturedate: string;
	numnights: number;
	primary_guestid: number;
}

interface Occupancy {
	occupancyid: number;
	occupancyin: string;
	occupancyout: string;
}

let page: Page;

async function summary(resnumber: number): Promise<Summary> {
	return (await rpc<Summary[]>('find_reservation', { p_resnumber: resnumber }))[0];
}

async function occupancies(reservationid: number): Promise<Occupancy[]> {
	const db = await staffClient();
	return (
		unwrap(
			await db
				.from('v_occupancy_summary')
				.select('occupancyid, occupancyin, occupancyout')
				.eq('reservationid', reservationid)
				.eq('occupancyarchive', false)
				.order('occupancyin')
		) as Occupancy[]
	).map((o) => ({ ...o, occupancyin: o.occupancyin.slice(0, 10), occupancyout: o.occupancyout.slice(0, 10) }));
}

async function checkDates(reservationid: number): Promise<{ in: string; out: string }[]> {
	const db = await staffClient();
	const rows = unwrap(
		await db
			.from('reservation_guests')
			.select('checkindate, checkoutdate')
			.eq('reservationid', reservationid)
			.eq('rgarchive', false)
	) as { checkindate: string; checkoutdate: string }[];
	return rows.map((r) => ({ in: r.checkindate.slice(0, 10), out: r.checkoutdate.slice(0, 10) }));
}

beforeAll(async () => {
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('change the dates of an existing reservation', () => {
	it('changes the arrival and departure of an existing reservation', async () => {
		const fx = await makeReservation({ nights: 3 });
		const extended = addDays(fx.departure, 4);
		await rpc('update_reservation', {
			p_reservationid: fx.reservationid,
			p_departure: extended
		});
		const s = await summary(fx.resnumber);
		expect(s.resdeparturedate.slice(0, 10)).toBe(extended);
		expect(s.resarrivaldate.slice(0, 10)).toBe(fx.arrival);
	});

	it('keeps the reservation number, its guests, and its rooms', async () => {
		const fx = await makeReservation({ nights: 3 });
		const roomsBefore = (await occupancies(fx.reservationid)).length;
		await rpc('update_reservation', {
			p_reservationid: fx.reservationid,
			p_departure: addDays(fx.departure, 2)
		});
		const s = await summary(fx.resnumber);
		expect(s.reservationid).toBe(fx.reservationid);
		expect(s.resnumber).toBe(fx.resnumber);
		expect(s.primary_guestid).toBe(fx.guestid);
		expect((await occupancies(fx.reservationid)).length).toBe(roomsBefore);
	});

	it('recalculates the night count from the new dates', async () => {
		const fx = await makeReservation({ nights: 3 });
		expect((await summary(fx.resnumber)).numnights).toBe(3);
		await rpc('update_reservation', {
			p_reservationid: fx.reservationid,
			p_departure: addDays(fx.arrival, 6)
		});
		expect((await summary(fx.resnumber)).numnights).toBe(6);
		// Shortening works the same way.
		await rpc('update_reservation', {
			p_reservationid: fx.reservationid,
			p_departure: addDays(fx.arrival, 2)
		});
		expect((await summary(fx.resnumber)).numnights).toBe(2);
	});

	it('moves the guests on the stay and the rooms they occupy with the dates', async () => {
		const fx = await makeReservation({ nights: 3 });
		const arrival = addDays(fx.arrival, 1);
		const departure = addDays(fx.departure, 3);
		await rpc('update_reservation', {
			p_reservationid: fx.reservationid,
			p_arrival: arrival,
			p_departure: departure
		});
		expect(await checkDates(fx.reservationid)).toEqual([{ in: arrival, out: departure }]);
		expect(await occupancies(fx.reservationid)).toEqual([
			expect.objectContaining({ occupancyin: arrival, occupancyout: departure })
		]);
	});

	it('leaves a room booked for part of the stay only on its own dates', async () => {
		const fx = await makeReservation({ nights: 4 });
		const moveDate = addDays(fx.arrival, 2);
		const [first] = await occupancies(fx.reservationid);
		const otherRoom = (await rpc<{ roomid: number }[]>('room_directory'))[1].roomid;
		await rpc('record_room_move', {
			p_occupancyid: first.occupancyid,
			p_new_roomid: otherRoom,
			p_move_date: moveDate
		});

		const extended = addDays(fx.departure, 3);
		await rpc('update_reservation', {
			p_reservationid: fx.reservationid,
			p_departure: extended
		});

		const after = await occupancies(fx.reservationid);
		expect(after).toHaveLength(2);
		// The first room still ends on the move date; only the room running to
		// the end of the stay follows the new departure.
		expect(after[0]).toEqual(expect.objectContaining({ occupancyin: fx.arrival, occupancyout: moveDate }));
		expect(after[1]).toEqual(expect.objectContaining({ occupancyin: moveDate, occupancyout: extended }));
	});

	it('refuses a departure on or before the arrival', async () => {
		const fx = await makeReservation({ nights: 3 });
		await expect(
			rpc('update_reservation', {
				p_reservationid: fx.reservationid,
				p_departure: fx.arrival
			})
		).rejects.toThrow(/after arrival/i);
		expect((await summary(fx.resnumber)).resdeparturedate.slice(0, 10)).toBe(fx.departure);
	});

	it('changes the dates from the reservation screen', async () => {
		const fx = await makeReservation({ nights: 2, roomid: await firstRoomId() });
		const extended = addDays(fx.departure, 3);

		await page.goto(APP_URL + `/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Change dates' }).click();
		await page.locator('#d-dep').waitFor({ timeout: 10_000 });
		await page.fill('#d-dep', extended);
		await page.getByRole('button', { name: 'Save dates' }).click();

		await expect
			.poll(async () => (await summary(fx.resnumber)).resdeparturedate.slice(0, 10), {
				timeout: 20_000
			})
			.toBe(extended);
	});
});
