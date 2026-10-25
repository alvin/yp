// Story: spec/features/segment-reservation-history-into-future-present-in-house-and-pas.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, screenDate, useAppPage } from '../helpers/app';
import {
	addDays,
	isolatedDate,
	makeReservation,
	roomDirectory,
	rpc,
	todayISO,
	type RoomRow
} from '../helpers/db';

interface Stay {
	resnumber: number;
	arrival: string;
	departure: string;
}

let guestid: number;
let room: RoomRow;
let past: Stay;
let lastYear: Stay; // a later past stay
let present: Stay;
let soon: Stay;
let later: Stay;

const page = useAppPage();
const section = (title: string) => page.locator('section', { has: page.locator('h2', { hasText: title }) });
const rowsOf = (title: string) => section(title).locator('a[href^="/reservations/"]');

async function book(arrival: string, departure: string): Promise<Stay> {
	const [stay] = await rpc<{ resnumber: number }[]>('create_reservation', {
		p_guestid: guestid,
		p_arrival: arrival,
		p_departure: departure,
		p_bookedby: 'QA',
		p_roomid: room.roomid
	});
	return { resnumber: stay.resnumber, arrival, departure };
}

beforeAll(async () => {
	room = (await roomDirectory())[0];
	const first = await makeReservation({ roomid: room.roomid });
	guestid = first.guestid;
	past = { resnumber: first.resnumber, arrival: first.arrival, departure: first.departure };
	// A date of its own, later than the first stay's, so still past.
	const again = isolatedDate();
	lastYear = await book(again, addDays(again, 2));
	const today = todayISO();
	present = await book(addDays(today, -1), addDays(today, 1));
	soon = await book(addDays(today, 45), addDays(today, 48));
	later = await book(addDays(today, 60), addDays(today, 63));
	await page.goto(`${APP_URL}/guests/${guestid}`, { waitUntil: 'networkidle' });
});

describe('segment reservation history into future, present/in-house, and past', () => {
	it('groups the history under its three headings, in house first', async () => {
		await expect
			.poll(() => page.locator('section h2').allTextContents())
			.toEqual(['Present reservation (in house)', 'Future reservations', 'Past reservations']);
	});

	it('puts each stay only in the section its dates call for, the latest arrival first', async () => {
		const numbers = async (title: string) =>
			(await rowsOf(title).allTextContents()).map((t) => Number(t.match(/#(\d+)/)?.[1]));
		expect(await numbers('Present reservation')).toEqual([present.resnumber]);
		expect(await numbers('Future reservations')).toEqual([later.resnumber, soon.resnumber]);
		expect(await numbers('Past reservations')).toEqual([lastYear.resnumber, past.resnumber]);
	});

	it('shows the number, status, dates and rooms on each row, the stay in house badged In house', async () => {
		for (const [title, stay, status] of [
			['Present reservation', present, 'In house'],
			['Future reservations', soon, 'Future'],
			['Past reservations', past, 'Past']
		] as const) {
			const row = rowsOf(title).filter({ hasText: `#${stay.resnumber}` });
			expect(await row.locator('[data-slot=badge]').textContent(), title).toBe(status);
			const text = (await row.textContent()) ?? '';
			expect(text, title).toContain(`${screenDate(stay.arrival)} → ${screenDate(stay.departure)}`);
			expect(text, title).toContain(room.room);
		}
	});
});
