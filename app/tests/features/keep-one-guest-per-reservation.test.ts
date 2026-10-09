// Story: spec/features/keep-one-guest-per-reservation.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import {
	addDays,
	isolatedDate,
	makeReservation,
	rpc,
	staffClient,
	uid,
	unwrap,
	type Fixture
} from '../helpers/db';

async function liveGuests(reservationid: number) {
	const client = await staffClient();
	return unwrap(
		await client
			.from('reservation_guests')
			.select('reservationguestid, guestid, primaryguest, checkindate, checkoutdate')
			.eq('reservationid', reservationid)
			.eq('rgarchive', false)
	) as {
		reservationguestid: number;
		guestid: number;
		primaryguest: boolean;
		checkindate: string;
		checkoutdate: string;
	}[];
}

let fx: Fixture;
let page: Page;

beforeAll(async () => {
	fx = await makeReservation();
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('keep one guest per reservation', () => {
	it('books a reservation under one guest, its primary guest', async () => {
		const guests = await liveGuests(fx.reservationid);
		expect(guests).toHaveLength(1);
		expect(guests[0].guestid).toBe(fx.guestid);
		expect(guests[0].primaryguest).toBe(true);
	});

	it('refuses a second guest on the same reservation, even straight in the database', async () => {
		const other = await rpc<number>('create_guest', { p_lastname: `ZZCo-${uid()}` });
		const client = await staffClient();
		const { error } = await client
			.from('reservation_guests')
			.insert({ reservationid: fx.reservationid, guestid: other });
		expect(error?.message).toMatch(/reservation_guests_one_per_reservation|duplicate/);
		expect(await liveGuests(fx.reservationid)).toHaveLength(1);
		// Nor is there a call left that adds a name.
		await expect(
			rpc('add_reservation_guest', { p_reservationid: fx.reservationid, p_guestid: other })
		).rejects.toThrow();
	});

	it('posts every charge and payment to the guest, with nothing splitting the bill', async () => {
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		const body = await page.textContent('body');
		expect(body).not.toContain('of bill');
		expect(await page.getByRole('button', { name: 'Add guest' }).count()).toBe(0);

		await page.getByRole('button', { name: 'Charge', exact: true }).click();
		await page.locator('#c-qty').waitFor();
		expect(await page.locator('#c-guest').count()).toBe(0);
		await page.keyboard.press('Escape');

		await page.getByRole('button', { name: 'Payment', exact: true }).click();
		await page.locator('#p-amt').waitFor();
		expect(await page.locator('#p-guest').count()).toBe(0);
		await page.fill('#p-amt', '40');
		await page.getByRole('button', { name: 'Record', exact: true }).click();
		await expect
			.poll(
				async () => {
					const client = await staffClient();
					const rows = unwrap(
						await client
							.from('payments')
							.select('reservationguestid')
							.eq('reservationguestid', fx.reservationguestid)
					) as unknown[];
					return rows.length;
				},
				{ timeout: 10_000 }
			)
			.toBe(1);
	});

	it('leaves a shared room’s charge whole on the reservation it is posted to', async () => {
		// Two parties in one room, booked as two reservations.
		const roomid = (await rpc<{ roomid: number }[]>('room_directory'))[0].roomid;
		const first = await makeReservation({ roomid });
		const second = await makeReservation({ roomid, arrival: first.arrival, departure: first.departure });
		const shared = await rpc<{ other_resnumber: number }[]>('shared_room_occupancies', {
			p_reservationid: first.reservationid
		});
		expect(shared.map((r) => r.other_resnumber)).toContain(second.resnumber);

		await rpc('post_room_nights', {
			p_reservationguestid: first.reservationguestid,
			p_roomid: roomid,
			p_occupancyin: first.arrival,
			p_occupancyout: first.departure,
			p_rate: 200,
			p_transdate: first.arrival
		});
		const charges = async (fx: Fixture) =>
			(
				await rpc<{ line_source: string; amount: number }[]>('reservation_ledger', {
					p_reservationid: fx.reservationid
				})
			)
				.filter((l) => l.line_source === 'transaction')
				.map((l) => Number(l.amount));
		expect(await charges(first)).toEqual([600]);
		expect(await charges(second)).toEqual([]);
	});

	it('gives a guest put on without dates the reservation’s dates', async () => {
		// A booking written straight to the tables, as a direct database edit would.
		const arrival = isolatedDate();
		const client = await staffClient();
		const [res] = unwrap(
			await client
				.from('reservations')
				.insert({ resbookedby: 'QA', resarrivaldate: arrival, resdeparturedate: addDays(arrival, 2) })
				.select('reservationid')
		) as { reservationid: number }[];
		const guestid = await rpc<number>('create_guest', { p_lastname: `ZZDirect-${uid()}` });
		unwrap(
			await client.from('reservation_guests').insert({ reservationid: res.reservationid, guestid })
		);
		const [guest] = await liveGuests(res.reservationid);
		expect(guest.checkindate.slice(0, 10)).toBe(arrival);
		expect(guest.checkoutdate.slice(0, 10)).toBe(addDays(arrival, 2));
		expect(guest.primaryguest).toBe(true);
	});
});
