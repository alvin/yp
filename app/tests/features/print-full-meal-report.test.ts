// Story: spec/features/print-full-meal-report.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, printedDate, useAppPage } from '../helpers/app';
import { addDays, makeReservation, roomDirectory, rpc, type Fixture } from '../helpers/db';

// Typed the way the desk types: punctuation, capitals and asterisks included.
const DIET = 'No red meat - Pork OK';
const NOTES = 'PREFERS THE CORNER TABLE *extra crispy bacon*';
const ALLERGY = 'Nut allergy';

let dieting: Fixture; // a party of two with a diet and notes
let allergic: Fixture; // a party of one whose diet is an allergy
let noDiet: Fixture; // a party of two with nothing on file for the kitchen
let day: string;

const page = useAppPage();
const rows = () => page.locator('.report-page tbody tr');

beforeAll(async () => {
	const rooms = await roomDirectory();
	dieting = await makeReservation({ roomid: rooms[0].roomid });
	allergic = await makeReservation({ arrival: dieting.arrival, numadults: 1, roomid: rooms[1].roomid });
	noDiet = await makeReservation({ arrival: dieting.arrival, roomid: rooms[2].roomid });
	await rpc('save_kitchen_meal', { p_guestid: dieting.guestid, p_guestdiet: DIET, p_notes: NOTES });
	await rpc('save_kitchen_meal', { p_guestid: allergic.guestid, p_guestdiet: ALLERGY });
	day = addDays(dieting.arrival, 1);
});

describe('print full meal report', () => {
	it('opens from the print menu for the day chosen, the day in its heading', async () => {
		await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
		await page.fill('#print-date', day);
		await page.click('a[href^="/reports/kitchen?"]');
		await page.waitForURL(`${APP_URL}/reports/kitchen?date=${day}`, { timeout: 15_000 });
		await expect.poll(() => page.textContent('.report-page h3')).toBe(`for ${printedDate(day)}`);
	});

	it('lists each stay in house with a diet: number, guest, dates, and the diet with its notes word for word', async () => {
		await expect.poll(() => rows().count(), { timeout: 10_000 }).toBe(2);
		const cells = await rows()
			.filter({ hasText: String(dieting.resnumber) })
			.locator('td')
			.allTextContents();
		expect(cells.slice(0, 4)).toEqual([
			String(dieting.resnumber),
			`${dieting.lastname}, Test`,
			printedDate(dieting.arrival),
			printedDate(dieting.departure)
		]);
		expect(cells[4]).toContain(DIET);
		expect(cells[4]).toContain(NOTES);
		expect(await rows().filter({ hasText: String(noDiet.resnumber) }).count()).toBe(0);
	});

	it("carries the day's Total Guests", async () => {
		expect(await page.textContent('.report-page')).toMatch(/Total Guests\D*5\b/);
	});

	it('narrows to the allergies on screen, without a Total Guests line', async () => {
		await page.getByRole('button', { name: 'Allergy only' }).click();
		await expect.poll(() => rows().allTextContents()).toEqual([
			expect.stringContaining(String(allergic.resnumber))
		]);
		expect(await page.textContent('.report-page')).not.toContain('Total Guests');
	});
});
