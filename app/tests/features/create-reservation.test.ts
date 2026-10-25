// Story: spec/features/create-reservation.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, field, useAppPage } from '../helpers/app';
import {
	addDays,
	roomDirectory,
	rpc,
	staffClient,
	todayISO,
	uid,
	unwrap,
	type RoomRow
} from '../helpers/db';

interface Summary {
	reservationid: number;
	resarrivaldate: string;
	resdeparturedate: string;
	numnights: number;
	numadults: number;
	bedtype: string;
	resbookedby: string;
	primary_guestid: number;
}

const page = useAppPage('/');

let lastname: string;
let arrival: string;
let room: RoomRow;
let resnumber: number;

beforeAll(async () => {
	lastname = `ZZCreate${uid()}`;
	arrival = addDays(todayISO(), 40);
	room = (await roomDirectory())[0];
});

describe('create reservation', () => {
	it("begins a new reservation from the lookup screen's New Reservation action", async () => {
		await page.locator('a:has-text("New reservation")').first().click();
		await page.waitForURL(`${APP_URL}/reservations/new`, { timeout: 15_000 });
		await page.locator('#ln').waitFor({ timeout: 10_000 });
	});

	it('asks for the details the lodge writes to and calls, and nothing it does not use', async () => {
		for (const id of ['#ln', '#fn', '#ad', '#ci', '#rg', '#pc', '#cn', '#ph', '#em']) {
			expect(await page.locator(id).count(), id).toBe(1);
		}
		expect(await page.textContent('main')).not.toMatch(/Company/i);
	});

	it('takes the party as its number of adults, with no children or group fields', async () => {
		expect(await page.getByLabel('Adults', { exact: true }).count()).toBe(1);
		expect(await page.getByLabel('Children').count()).toBe(0);
		expect(await page.getByLabel('Group').count()).toBe(0);
	});

	it('offers the bed layout in the lodge’s own words rather than a bed count', async () => {
		await page.click('#bed');
		const options = page.locator('[data-testid=combobox-list] [role=option]');
		await options.first().waitFor({ timeout: 10_000 });
		expect((await options.allTextContents()).map((o) => o.trim())).toEqual(['Regular', 'Split']);
		await options.filter({ hasText: 'Split' }).click();
	});

	it('puts a new guest on file and holds the stay under them, opening it for review', async () => {
		await page.fill('#ln', lastname);
		await page.fill('#fn', 'Uma');
		await page.fill('#ad', '12 Shore Road');
		await page.fill('#ci', 'Ladysmith');
		await page.fill('#ph', '(250) 555-0808');
		await page.fill('#em', 'uma@example.test');
		await page.fill('#arr', arrival);
		await page.fill('#dep', addDays(arrival, 4));
		await page.fill('#ad2', '3');
		await page.fill('#bb', 'QA');
		await page.click('#room');
		await page.keyboard.type(room.room_compact);
		await page.locator('[data-testid=combobox-list] [role=option]').first().click();
		await page.getByRole('button', { name: 'Save reservation' }).click();
		await page.waitForURL(/\/reservations\/\d+$/, { timeout: 20_000 });
		resnumber = Number(page.url().split('/').pop());

		const db = await staffClient();
		const guests = unwrap(
			await db
				.from('guests')
				.select('guestid, guestfirstname, guestaddress, guestcity, guestprimaryphone, guestemailaddress')
				.eq('guestlastname', lastname)
		) as { guestid: number }[];
		expect(guests).toEqual([
			{
				guestid: expect.any(Number),
				guestfirstname: 'Uma',
				guestaddress: '12 Shore Road',
				guestcity: 'Ladysmith',
				guestprimaryphone: '(250) 555-0808',
				guestemailaddress: 'uma@example.test'
			}
		]);

		const [stay] = await rpc<Summary[]>('find_reservation', { p_resnumber: resnumber });
		const dates = {
			resarrivaldate: stay.resarrivaldate.slice(0, 10),
			resdeparturedate: stay.resdeparturedate.slice(0, 10)
		};
		expect({ ...stay, ...dates }).toEqual(
			expect.objectContaining({
				resarrivaldate: arrival,
				resdeparturedate: addDays(arrival, 4),
				numnights: 4,
				numadults: 3,
				bedtype: 'Twin',
				resbookedby: 'QA',
				primary_guestid: guests[0].guestid
			})
		);
		const rooms = unwrap(
			await db.from('v_occupancy_summary').select('roomid').eq('reservationid', stay.reservationid)
		) as { roomid: number }[];
		expect(rooms).toEqual([{ roomid: room.roomid }]);
	});

	it('shows the booking back in the same words on the reservation', async () => {
		await expect.poll(() => page.textContent('h1')).toContain(`Reservation #${resnumber}`);
		expect(await field(page, 'Beds').textContent()).toBe('Split');
		expect(await page.textContent('body')).toContain(room.room_compact);
	});
});
