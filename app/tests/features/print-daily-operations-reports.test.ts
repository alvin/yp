// Story: spec/features/print-daily-operations-reports.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, printedDate, useAppPage } from '../helpers/app';
import { addDays, makeReservation, roomDirectory, rpc, todayISO, type Fixture } from '../helpers/db';

describe('print daily operations reports', () => {
	const page = useAppPage('/print');

	it('opens each daily report in the print menu for the one date chosen', async () => {
		const d = addDays(todayISO(), 3);
		await page.fill('#print-date', d);
		for (const report of ['housekeeping', 'in-house', 'requests', 'kitchen', 'manual-sales']) {
			await expect
				.poll(() => page.getAttribute(`a[href^="/reports/${report}?"]`, 'href'), { timeout: 5_000 })
				.toBe(`/reports/${report}?date=${d}`);
		}
	});

	it('lets staff set an end date where a report supports a range', async () => {
		const from = addDays(todayISO(), 3);
		const to = addDays(todayISO(), 6);
		await page.fill('#print-date', from);
		await page.fill('#print-end-date', to);
		await expect
			.poll(() => page.getAttribute('a[href*="/reports/kitchen-filtered"]', 'href'), {
				timeout: 5_000
			})
			.toBe(`/reports/kitchen-filtered?from=${from}&to=${to}`);
		await expect
			.poll(() => page.getAttribute('a[href*="/reports/cancellation-list"]', 'href'))
			.toBe(`/reports/cancellation-list?from=${from}&to=${to}`);
		await page.fill('#print-end-date', '');
		await expect
			.poll(() => page.getAttribute('a[href*="/reports/cancellation-list"]', 'href'))
			.toBe(`/reports/cancellation-list?from=${addDays(from, -6)}&to=${from}`);
	});

	it('runs the 7-day kitchen report seven days from the report date when no end date is set', async () => {
		const from = addDays(todayISO(), 3);
		await page.fill('#print-date', from);
		await page.fill('#print-end-date', '');
		await expect
			.poll(() => page.getAttribute('a[href*="/reports/kitchen-filtered"]', 'href'), {
				timeout: 5_000
			})
			.toBe(`/reports/kitchen-filtered?from=${from}&to=${addDays(from, 6)}`);
	});
});

describe('print daily operations reports — the printed report', () => {
	const reportPage = useAppPage();
	let fx: Fixture;
	let mid: string;

	beforeAll(async () => {
		fx = await makeReservation();
		mid = addDays(fx.arrival, 1);
		// A diet, so the kitchen reports have a line too.
		await rpc('save_kitchen_meal', { p_guestid: fx.guestid, p_guestdiet: 'Vegan' });
	});

	it('prints the report for the date chosen', async () => {
		await reportPage.goto(`${APP_URL}/reports/housekeeping?date=${mid}`, {
			waitUntil: 'networkidle'
		});
		await expect.poll(() => reportPage.textContent('.report-page h3')).toBe(`for ${printedDate(mid)}`);
		expect(await reportPage.textContent('.report-page')).toContain(fx.lastname);
	});

	it('re-dates the report from the report screen', async () => {
		const later = addDays(fx.departure, 1);
		await reportPage.fill('#report-date', later);
		await reportPage.waitForURL(`${APP_URL}/reports/housekeeping?date=${later}`, { timeout: 15_000 });
		await expect.poll(() => reportPage.textContent('.report-page h3')).toBe(`for ${printedDate(later)}`);
		expect(await reportPage.textContent('.report-page')).not.toContain(fx.lastname);
		await reportPage.goto(`${APP_URL}/reports/housekeeping?date=${mid}`, { waitUntil: 'networkidle' });
	});

	it('prints a report with no footer and no page numbers', async () => {
		await reportPage.goto(`${APP_URL}/reports/housekeeping?date=${mid}`, { waitUntil: 'networkidle' });
		expect(await reportPage.locator('.report-page .footer').count()).toBe(0);
		// Page numbers would be a named page with a margin rule; there is none.
		const pageName = await reportPage
			.locator('.report-page')
			.first()
			.evaluate((el) => getComputedStyle(el).page);
		expect(pageName).toBe('auto');
		const marginRules = await reportPage.evaluate(() =>
			[...document.styleSheets].flatMap((sheet) => {
				try {
					return [...sheet.cssRules].map((r) => r.cssText).filter((t) => t.includes('counter(page'));
				} catch {
					return [];
				}
			})
		);
		expect(marginRules).toEqual([]);
		await reportPage.goto(`${APP_URL}/reports/confirmation/${fx.resnumber}`, {
			waitUntil: 'networkidle'
		});
	});

	it('sets report lines a size smaller than a guest document, and keeps each date on one line', async () => {
		const tableSize = () =>
			reportPage.locator('.report-page table').first().evaluate((el) => getComputedStyle(el).fontSize);
		expect(await tableSize()).toBe('16px'); // the confirmation, from the test before
		await reportPage.goto(`${APP_URL}/reports/manual-sales?date=${mid}`, { waitUntil: 'networkidle' });
		expect(await tableSize()).toBe('14px');
		await reportPage.goto(`${APP_URL}/reports/housekeeping?date=${mid}`, { waitUntil: 'networkidle' });
		const dates = await reportPage
			.locator('.report-page td.date')
			.evaluateAll((els) => els.map((e) => getComputedStyle(e).whiteSpace));
		expect(dates.length).toBeGreaterThan(0);
		expect(new Set(dates)).toEqual(new Set(['nowrap']));
	});

	it('prints Housekeeping, In House and both kitchen reports in portrait, smaller again, their lines dated without the year', async () => {
		for (const report of [
			`housekeeping?date=${mid}`,
			`in-house?date=${mid}`,
			`kitchen?date=${mid}`,
			`kitchen-filtered?from=${fx.arrival}&to=${mid}`
		]) {
			await reportPage.goto(`${APP_URL}/reports/${report}`, { waitUntil: 'networkidle' });
			const pageRule = await reportPage.evaluate(() =>
				[...document.querySelectorAll('style')]
					.map((s) => s.textContent ?? '')
					.filter((t) => t.includes('@page'))
					.join('\n')
			);
			expect(pageRule, report).toContain('size: letter portrait');
			expect(
				await reportPage.locator('.report-page table').first().evaluate((el) => getComputedStyle(el).fontSize),
				report
			).toBe('12px');
			const dates = (await reportPage.locator('.report-page td.date').allTextContents()).filter(Boolean);
			expect(dates.length, report).toBeGreaterThan(0);
			for (const d of dates) expect(d, report).toMatch(/^\d{2}-[A-Z][a-z]{2}$/);
			// The heading's date keeps its year.
			expect(await reportPage.textContent('.report-page h3'), report).toMatch(/\d{2}-[A-Z][a-z]{2}-\d{2}\b/);
		}
	});

	it('gives the Cancellation report its own range of days, apart from the daily reports', async () => {
		const from = addDays(mid, -3);
		await reportPage.goto(`${APP_URL}/reports/cancellation-list?from=${from}&to=${mid}`, {
			waitUntil: 'networkidle'
		});
		expect(await reportPage.inputValue('#cancellations-from')).toBe(from);
		expect(await reportPage.inputValue('#cancellations-to')).toBe(mid);
		await expect
			.poll(() => reportPage.textContent('.report-page h3'))
			.toBe(`Cancelled between ${printedDate(from)} and ${printedDate(mid)}`);
		await reportPage.goto(`${APP_URL}/reports/housekeeping?date=${mid}`, { waitUntil: 'networkidle' });
		expect(await reportPage.locator('a[href*="/reports/cancellation-list"]').count()).toBe(0);
	});
});

describe('print daily operations reports — each line ruled and shaded', () => {
	const reportPage = useAppPage();
	let date: string;

	beforeAll(async () => {
		// Two rooms held the same night, so the reports have two lines.
		const rooms = await roomDirectory();
		const first = await makeReservation({ roomid: rooms[0].roomid });
		await makeReservation({ arrival: first.arrival, roomid: rooms[1].roomid });
		date = addDays(first.arrival, 1);
	});

	it('rules off the lines of every daily report', async () => {
		for (const report of [
			`housekeeping?date=${date}`,
			`in-house?date=${date}`,
			`kitchen?date=${date}`,
			`kitchen-filtered?from=${date}`,
			`manual-sales?date=${date}`,
			`cancellation-list?from=${date}&to=${date}`
		]) {
			await reportPage.goto(`${APP_URL}/reports/${report}`, { waitUntil: 'networkidle' });
			expect(await reportPage.locator('.report-page table.ruled').count(), report).toBeGreaterThan(0);
		}
	});

	it('shades every other line, on paper as on screen', async () => {
		await reportPage.goto(`${APP_URL}/reports/housekeeping?date=${date}`, {
			waitUntil: 'networkidle'
		});
		await reportPage.emulateMedia({ media: 'print' });
		try {
			const rows = reportPage.locator('.report-page table.ruled tbody tr');
			expect(await rows.count()).toBe(2);
			const look = (i: number) =>
				rows.nth(i).evaluate((el) => {
					const s = getComputedStyle(el);
					return {
						background: s.backgroundColor,
						rule: `${s.borderBottomWidth} ${s.borderBottomStyle}`,
						// Without this a browser prints no background colour at all.
						printed:
							s.getPropertyValue('print-color-adjust') ||
							s.getPropertyValue('-webkit-print-color-adjust')
					};
				});
			const [one, two] = [await look(0), await look(1)];
			expect(one.rule).toBe('1px solid');
			expect(two.rule).toBe('1px solid');
			expect(one.background).toBe('rgba(0, 0, 0, 0)');
			expect(two.background).not.toBe('rgba(0, 0, 0, 0)');
			expect(two.printed).toBe('exact');
		} finally {
			await reportPage.emulateMedia({ media: 'screen' });
		}
	});
});
