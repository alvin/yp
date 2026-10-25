// Story: spec/features/search-by-arrival-date.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, screenDate, useAppPage } from '../helpers/app';
import {
	addDays,
	cancel,
	isolatedDate,
	makeReservation,
	pay,
	roomDirectory,
	searchByDate,
	uid,
	type Fixture,
	type RoomRow
} from '../helpers/db';

let date: string;
let lastA: string;
let lastB: string;
let anna: Fixture; // lastA, Anna — in a room, a deposit partly applied and kept
let zed: Fixture; // lastA, Zed — no room, no deposit
let bo: Fixture; // lastB — cancelled
let room: RoomRow;

const page = useAppPage();
const rows = () => page.locator('tbody tr');

beforeAll(async () => {
	date = isolatedDate();
	const u = uid();
	lastA = `ZZSortA-${u}`;
	lastB = `ZZSortB-${u}`;
	const rooms = await roomDirectory();
	room = rooms[0];
	// Booked out of alphabetical order, so the order on screen can only come
	// from sorting.
	bo = await makeReservation({ arrival: date, nights: 2, lastname: lastB, firstname: 'Bo', roomid: rooms[1].roomid });
	zed = await makeReservation({ arrival: date, nights: 2, lastname: lastA, firstname: 'Zed', roomid: null });
	anna = await makeReservation({ arrival: date, nights: 2, lastname: lastA, firstname: 'Anna', roomid: room.roomid });
	await pay(anna, 'Deposit (Received)', 200);
	await pay(anna, 'Deposit (Applied)', 50);
	await pay(anna, 'Deposit (Kept)', 30);
	await cancel(bo);
});

describe('search by arrival date', () => {
	it('searches arrivals when no mode is chosen', async () => {
		expect((await searchByDate(date)).map((r) => r.match_type)).toEqual(['arrival', 'arrival', 'arrival']);
		await page.goto(`${APP_URL}/date?date=${date}`, { waitUntil: 'networkidle' });
		await expect.poll(() => page.textContent('h1')).toBe(`Arrivals · ${screenDate(date)}`);
	});

	it('shows the stays arriving that day and only those', async () => {
		const later = await makeReservation({ arrival: addDays(date, 1), nights: 1, roomid: null });
		const found = (await searchByDate(date)).map((r) => r.resnumber);
		expect(found.sort()).toEqual([anna.resnumber, zed.resnumber, bo.resnumber].sort());
		expect((await searchByDate(addDays(date, 1))).map((r) => r.resnumber)).toEqual([later.resnumber]);
	});

	it('runs the rows by last name, then first name', async () => {
		await expect
			.poll(async () => (await rows().locator('td:first-child').allTextContents()).map((t) => t.trim()))
			.toEqual([
				expect.stringMatching(new RegExp(`^${lastA}, Anna\\s*#${anna.resnumber}$`)),
				expect.stringMatching(new RegExp(`^${lastA}, Zed\\s*#${zed.resnumber}$`)),
				expect.stringMatching(new RegExp(`^${lastB}, Bo\\s*#${bo.resnumber}\\s*Cancelled$`))
			]);
	});

	it('shows the room, dates, nights, party and deposit still held on each row', async () => {
		const cells = (await rows().nth(0).locator('td').allTextContents()).map((t) => t.trim());
		expect(cells.slice(1, 8)).toEqual([
			room.room,
			screenDate(date),
			screenDate(anna.departure),
			'2',
			'2',
			'$120.00',
			'Arrival'
		]);
	});

	it('shows a dash where no room is assigned, and no deposit as awaited', async () => {
		const cells = (await rows().nth(1).locator('td').allTextContents()).map((t) => t.trim());
		expect(cells[1]).toBe('—');
		expect(cells[6]).toBe('Awaiting');
	});

	it('lists a cancelled reservation, marked Cancelled', async () => {
		expect(await rows().nth(2).locator('[data-slot=badge]').first().textContent()).toBe('Cancelled');
	});

	it('opens the reservation on the row chosen', async () => {
		await rows().nth(1).click();
		await page.waitForURL(`${APP_URL}/reservations/${zed.resnumber}`, { timeout: 15_000 });
		await expect.poll(() => page.textContent('h1')).toContain(`Reservation #${zed.resnumber}`);
		expect(await page.textContent('body')).toContain(`${lastA}, Zed`);
	});
});
