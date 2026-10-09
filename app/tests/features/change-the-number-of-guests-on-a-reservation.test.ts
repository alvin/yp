// Story: spec/features/change-the-number-of-guests-on-a-reservation.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

interface Room {
	occupancyid: number;
	roomid: number;
	occupancynumguests: number | null;
}

async function rooms(fx: Fixture): Promise<Room[]> {
	const client = await staffClient();
	return unwrap(
		await client
			.from('room_assignments')
			.select('occupancyid, roomid, occupancynumguests')
			.eq('reservationguestid', fx.reservationguestid)
			.eq('occupancyarchive', false)
			.order('occupancyid')
	) as Room[];
}

let roomIds: number[];

beforeAll(async () => {
	roomIds = (await rpc<{ roomid: number }[]>('room_directory')).map((r) => r.roomid);
});

describe('change the number of guests on a reservation', () => {
	it('gives the new number to the room the whole party is in, which the reports count', async () => {
		const fx = await makeReservation({ numadults: 2 });
		await rpc('update_reservation', {
			p_reservationid: fx.reservationid,
			p_numadults: 3,
			p_numchildren: 1
		});
		expect((await rooms(fx)).map((r) => r.occupancynumguests)).toEqual([4]);

		const night = addDays(fx.arrival, 1);
		const housekeeping = await rpc<{ resnumber: number; guest_count: number }[]>(
			'report_housekeeping',
			{ p_date: night }
		);
		expect(housekeeping.find((r) => r.resnumber === fx.resnumber)?.guest_count).toBe(4);
		expect(await rpc<number>('guests_in_house', { p_date: night })).toBe(4);
		const [folio] = await rpc<{ guest_count: number }[]>('report_check_in_folio', {
			p_reservationid: fx.reservationid
		});
		expect(folio.guest_count).toBe(4);
	});

	it('gives it to each room of a move, the party moving whole', async () => {
		const fx = await makeReservation({ roomid: roomIds[0], nights: 4 });
		const [first] = await rooms(fx);
		await rpc('record_room_move', {
			p_occupancyid: first.occupancyid,
			p_new_roomid: roomIds[1],
			p_move_date: addDays(fx.arrival, 2)
		});
		await rpc('update_reservation', { p_reservationid: fx.reservationid, p_numadults: 1 });
		expect((await rooms(fx)).map((r) => r.occupancynumguests)).toEqual([1, 1]);
	});

	it('leaves rooms held side by side their own numbers, each changed on its own', async () => {
		const fx = await makeReservation({ roomid: roomIds[0], numadults: 4 });
		await rpc('assign_room', {
			p_reservationguestid: fx.reservationguestid,
			p_roomid: roomIds[1],
			p_occupancyin: fx.arrival,
			p_occupancyout: fx.departure,
			p_numguests: 2
		});
		const [one, two] = await rooms(fx);
		await rpc('update_room_assignment', { p_occupancyid: one.occupancyid, p_numguests: 2 });
		await rpc('update_reservation', { p_reservationid: fx.reservationid, p_numadults: 5 });
		expect((await rooms(fx)).map((r) => r.occupancynumguests)).toEqual([2, 2]);
		await rpc('update_room_assignment', { p_occupancyid: two.occupancyid, p_numguests: 3 });
		expect((await rooms(fx)).map((r) => r.occupancynumguests)).toEqual([2, 3]);
	});

	it('follows a number changed straight in the database', async () => {
		const fx = await makeReservation({ numadults: 2 });
		const client = await staffClient();
		unwrap(
			await client
				.from('reservations')
				.update({ numadults: 1, numchildren: 2 })
				.eq('reservationid', fx.reservationid)
				.select('reservationid')
		);
		expect((await rooms(fx)).map((r) => r.occupancynumguests)).toEqual([3]);
	});

	it('refuses a reservation or a room with no one in it', async () => {
		const fx = await makeReservation();
		await expect(
			rpc('update_reservation', {
				p_reservationid: fx.reservationid,
				p_numadults: 0,
				p_numchildren: 0
			})
		).rejects.toThrow(/at least one guest/);
		const [room] = await rooms(fx);
		await expect(
			rpc('update_room_assignment', { p_occupancyid: room.occupancyid, p_numguests: 0 })
		).rejects.toThrow(/at least one guest/);
	});
});

describe('change the number of guests on a reservation — on screen', () => {
	let page: Page;

	beforeAll(async () => {
		page = await openAppPage();
	});

	afterAll(async () => {
		await closeApp(page);
	});

	const guestsField = () => page.locator('dt', { hasText: 'Guests' }).locator('xpath=..');

	it('changes the number from the Guests field', async () => {
		const fx = await makeReservation({ numadults: 2 });
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		expect(await guestsField().textContent()).toContain('2 adults');
		await page.getByRole('button', { name: 'Change guests' }).click();
		await page.fill('#g-ad', '3');
		await page.fill('#g-ch', '2');
		// A party split across rooms isn't asked about room by room.
		expect(await page.locator('[data-testid=guests-per-room]').count()).toBe(0);
		await page.getByRole('button', { name: 'Save guests' }).click();
		await expect
			.poll(() => guestsField().textContent(), { timeout: 10_000 })
			.toContain('3 adults, 2 children');
		expect(await page.textContent('body')).toContain('5 guests');
		expect((await rooms(fx)).map((r) => r.occupancynumguests)).toEqual([5]);
	});

	it('asks for each room held side by side', async () => {
		const fx = await makeReservation({ roomid: roomIds[0], numadults: 3 });
		await rpc('assign_room', {
			p_reservationguestid: fx.reservationguestid,
			p_roomid: roomIds[1],
			p_occupancyin: fx.arrival,
			p_occupancyout: fx.departure,
			p_numguests: 1
		});
		const [one, two] = await rooms(fx);
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Change guests' }).click();
		await page.locator('[data-testid=guests-per-room]').waitFor();
		expect(await page.inputValue(`#g-room-${one.occupancyid}`)).toBe('3');
		expect(await page.inputValue(`#g-room-${two.occupancyid}`)).toBe('1');
		await page.fill(`#g-room-${two.occupancyid}`, '2');
		await page.getByRole('button', { name: 'Save guests' }).click();
		await expect
			.poll(async () => (await rooms(fx)).map((r) => r.occupancynumguests), { timeout: 10_000 })
			.toEqual([3, 2]);
	});

	it('offers no change on a cancelled reservation', async () => {
		const fx = await makeReservation();
		await rpc('cancel_reservation', {
			p_reservationid: fx.reservationid,
			p_date: fx.arrival,
			p_deposit_handling: 'none',
			p_notes: null
		});
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		await guestsField().waitFor();
		expect(await page.getByRole('button', { name: 'Change guests' }).count()).toBe(0);
	});
});
