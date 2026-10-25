// Story: spec/features/show-manual-sales-list.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { addDays, cancel, isolatedDate, makeReservation, roomDirectory, type Fixture, type RoomRow } from '../helpers/db';

let day: string;
let early: Fixture; // in the first room in the lodge's order
let late: Fixture; // in a room further down it, booked first
let cancelled: Fixture;
let rooms: RoomRow[];

const page = useAppPage();
const rows = () => page.locator('.report-page tbody tr');
const cells = async () =>
	Promise.all(
		(await rows().all()).map(async (r) => (await r.locator('td').allTextContents()).map((c) => c.trim()))
	);

beforeAll(async () => {
	const arrival = isolatedDate();
	day = addDays(arrival, 1);
	rooms = (await roomDirectory()).filter((r) => r.roomorder != null);
	// Booked out of room order, so the order on the sheet can only come from it.
	late = await makeReservation({ arrival, roomid: rooms[5].roomid });
	early = await makeReservation({ arrival, roomid: rooms[0].roomid });
	cancelled = await makeReservation({ arrival, roomid: rooms[2].roomid });
	await cancel(cancelled);
});

describe('show manual sales list', () => {
	it('opens from the print menu for the chosen date', async () => {
		await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
		await page.fill('#print-date', day);
		await page.getByRole('link', { name: /Liquor \/ charge list/ }).click();
		await page.waitForURL(`${APP_URL}/reports/manual-sales?date=${day}`, { timeout: 15_000 });
	});

	it('lists each occupied room in room order with its reservation and guest, and no charges', async () => {
		await expect.poll(() => rows().count(), { timeout: 10_000 }).toBe(2);
		expect((await page.locator('.report-page thead th').allTextContents()).map((t) => t.trim())).toEqual([
			'Room',
			'Res #',
			'Guest',
			'Room Order'
		]);
		expect(await cells()).toEqual([
			[rooms[0].room_compact, `☐ ${early.resnumber}`, early.lastname, String(rooms[0].roomorder)],
			[rooms[5].room_compact, `☐ ${late.resnumber}`, late.lastname, String(rooms[5].roomorder)]
		]);
	});

	it('adds the cancelled reservations back on request, their box ticked', async () => {
		await page.getByLabel('Show cancelled').check();
		await page.waitForURL(`${APP_URL}/reports/manual-sales?date=${day}&cancelled=1`, {
			timeout: 15_000
		});
		await expect.poll(() => rows().count(), { timeout: 10_000 }).toBe(3);
		expect((await cells()).map((c) => c[1])).toEqual([
			`☐ ${early.resnumber}`,
			`☑ ${cancelled.resnumber}`,
			`☐ ${late.resnumber}`
		]);
	});
});
