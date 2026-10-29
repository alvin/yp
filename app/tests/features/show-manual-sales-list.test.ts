// Story: spec/features/show-manual-sales-list.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { addDays, cancel, isolatedDate, makeReservation, roomDirectory, type Fixture, type RoomRow } from '../helpers/db';

let day: string;
let early: Fixture; // in the first room in the lodge's order
let late: Fixture; // in a room further down it, booked first
let cancelled: Fixture;
let leaving: Fixture; // checks out on the day
let rooms: RoomRow[];

const page = useAppPage();
const rows = () => page.locator('.report-page tbody tr');
// Each line as [room, reservation number under it, guest, items].
const cells = async () =>
	Promise.all(
		(await rows().all()).map(async (r) => [
			((await r.locator('td.room').evaluate((td) => td.firstChild?.textContent)) ?? '').trim(),
			((await r.locator('td.room .resno').textContent()) ?? '').trim(),
			((await r.locator('td.guest').textContent()) ?? '').trim(),
			((await r.locator('td.items').textContent()) ?? '').trim()
		])
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
	leaving = await makeReservation({ arrival: addDays(day, -2), departure: day, roomid: rooms[3].roomid });
});

describe('show manual sales list', () => {
	it('opens from the print menu for the chosen date', async () => {
		await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
		await page.fill('#print-date', day);
		await page.getByRole('link', { name: /Liquor \/ charge list/ }).click();
		await page.waitForURL(`${APP_URL}/reports/manual-sales?date=${day}`, { timeout: 15_000 });
	});

	it('lists each room slept in that night in room order, its reservation under the room, with a blank Items column', async () => {
		await expect.poll(() => rows().count(), { timeout: 10_000 }).toBe(2);
		expect((await page.locator('.report-page thead th').allTextContents()).map((t) => t.trim())).toEqual([
			'Room',
			'Guest',
			'Items'
		]);
		expect(await cells()).toEqual([
			[rooms[0].room_compact, `☐ ${early.resnumber}`, early.lastname, ''],
			[rooms[5].room_compact, `☐ ${late.resnumber}`, late.lastname, '']
		]);
		expect(await page.locator('.report-page').textContent()).not.toContain(String(leaving.resnumber));
	});

	it('gives Items the width of the sheet and each line room to write in, ruled off on paper', async () => {
		const items = page.locator('.report-page tbody td.items').first();
		const room = page.locator('.report-page tbody td.room').first();
		const [itemsBox, roomBox] = [await items.boundingBox(), await room.boundingBox()];
		expect(itemsBox!.width).toBeGreaterThan(roomBox!.width * 3);
		expect(itemsBox!.height).toBeGreaterThanOrEqual(48);
		await page.emulateMedia({ media: 'print' });
		try {
			const rule = await items.evaluate((td) => {
				const s = getComputedStyle(td);
				return `${s.borderLeftWidth} ${s.borderLeftStyle}`;
			});
			expect(rule).toBe('1px solid');
		} finally {
			await page.emulateMedia({ media: 'screen' });
		}
	});

	it("prints Access's line explaining the box beside each reservation number", async () => {
		expect(await page.locator('.report-page > p').allTextContents()).toEqual([
			expect.stringContaining('Checkbox beside Res # is visual check for Cancelled Reservations.')
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
