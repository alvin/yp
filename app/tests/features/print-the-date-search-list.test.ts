// Story: spec/features/print-the-date-search-list.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, isolatedDate, makeReservation, rpc } from '../helpers/db';

let page: Page;
let date: string;

beforeAll(async () => {
	// One stay arriving, one departing, one mid-stay, each in its own room, so
	// the list on this date holds all three kinds of match.
	date = isolatedDate();
	const rooms = await rpc<{ roomid: number }[]>('room_directory');
	await makeReservation({ arrival: date, nights: 2, roomid: rooms[0].roomid });
	await makeReservation({ arrival: addDays(date, -2), departure: date, roomid: rooms[1].roomid });
	await makeReservation({
		arrival: addDays(date, -1),
		departure: addDays(date, 1),
		roomid: rooms[2].roomid
	});
	page = await openAppPage();
	await page.goto(`${APP_URL}/date?date=${date}&mode=in_house`, { waitUntil: 'networkidle' });
});

afterAll(async () => {
	await closeApp(page);
});

/** The @page rules the screen carries. */
function pageRule(p: Page): Promise<string> {
	return p.evaluate(() =>
		Array.from(document.querySelectorAll('style'))
			.map((s) => s.textContent ?? '')
			.filter((t) => t.includes('@page'))
			.join('\n')
	);
}

describe('print the date search list', () => {
	it('offers a print action on the results screen', async () => {
		const button = page.locator('button:has-text("Print list")');
		await button.waitFor({ timeout: 15_000 });
		expect(await button.count()).toBe(1);
	});

	it('prints across the sheet, since the list is wider than it is tall', async () => {
		expect(await pageRule(page)).toContain('size: letter landscape');
	});

	it('lets every column reach the paper instead of clipping it', async () => {
		await page.emulateMedia({ media: 'print' });
		const fits = await page.evaluate(() => {
			// A cell may wrap, but no table may be wider than the box it sits in
			// — that is what cut the right-hand columns off the sheet.
			return Array.from(document.querySelectorAll('.date-list')).map((el) => {
				const table = el.querySelector('table') as HTMLElement;
				const container = table.parentElement as HTMLElement;
				return {
					clipped: getComputedStyle(container).overflowX === 'hidden',
					overflows: table.scrollWidth > container.clientWidth + 1,
					wraps: getComputedStyle(table.querySelector('td') as HTMLElement).whiteSpace
				};
			});
		});
		await page.emulateMedia({ media: 'screen' });
		expect(fits.length).toBeGreaterThan(0);
		for (const f of fits) {
			expect(f.clipped).toBe(false);
			expect(f.overflows).toBe(false);
			expect(f.wraps).toBe('normal');
		}
	});

	it('prints the sections and their headings as they appear on screen', async () => {
		const headings = await page.locator('h2').allTextContents();
		expect(headings).toEqual(['Arrivals', 'In house', 'Departures']);
		await page.emulateMedia({ media: 'print' });
		const visible = await page
			.locator('h2')
			.evaluateAll((els) => els.map((e) => getComputedStyle(e).display !== 'none'));
		await page.emulateMedia({ media: 'screen' });
		expect(visible).toEqual([true, true, true]);
	});

	it('leaves the search controls off the paper', async () => {
		await page.emulateMedia({ media: 'print' });
		const hidden = await page.evaluate(() =>
			Array.from(document.querySelectorAll('.no-print')).every(
				(el) => getComputedStyle(el).display === 'none'
			)
		);
		await page.emulateMedia({ media: 'screen' });
		expect(hidden).toBe(true);
	});
});
