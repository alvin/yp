// Story: spec/features/batch-print-the-daily-print-run.feature

import { beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, useAppPage } from '../helpers/app';
import { addDays, cancel, isolatedDate, makeReservation, roomDirectory, rpc, type Fixture } from '../helpers/db';

const DOCS = ['confirmation', 'check_in_folio', 'checkout_bill', 'cancellation_notice'] as const;
const ROUTES: Record<(typeof DOCS)[number], string> = {
	confirmation: 'confirmation',
	check_in_folio: 'check-in-folio',
	checkout_bill: 'checkout-bill',
	cancellation_notice: 'cancellation'
};

let day: string;
let arriving: Fixture;
let leaving: Fixture;
let cancelled: Fixture;

const page = useAppPage();

/** The @page rules a screen carries. */
function pageRules(p: Page): Promise<string> {
	return p.evaluate(() =>
		Array.from(document.querySelectorAll('style'))
			.map((s) => s.textContent ?? '')
			.filter((t) => t.includes('@page'))
			.join('\n')
	);
}

/** The @page rules in force at the moment the print dialog would open. */
async function rulesWhenPrinting(p: Page, testid: string): Promise<string> {
	// window.print() blocks the page in a real browser; stand in for it so the
	// test can read the rules in force at the moment printing starts.
	await p.evaluate(() => {
		const w = window as unknown as { __atPrint?: string };
		w.__atPrint = undefined;
		window.print = () => {
			w.__atPrint = Array.from(document.querySelectorAll('style'))
				.map((s) => s.textContent ?? '')
				.filter((t) => t.includes('@page'))
				.join('\n');
		};
	});
	await p.click(`[data-testid=${testid}]`);
	return p.evaluate(() => (window as unknown as { __atPrint?: string }).__atPrint ?? '');
}

async function openBatch(date: string): Promise<void> {
	await page.goto(`${APP_URL}/print/batch?date=${date}`, { waitUntil: 'networkidle' });
	await page.locator('[data-testid=print-reports]').waitFor({ timeout: 15_000 });
}

beforeAll(async () => {
	// One of each guest document on the batch's day: a stay arriving (its
	// check-in folio, and its confirmation, confirmed that day), a stay leaving
	// (its check-out bill), and a stay cancelled that day (its notice).
	const start = isolatedDate();
	const rooms = await roomDirectory();
	day = addDays(start, 2);
	arriving = await makeReservation({ arrival: day, nights: 2, roomid: rooms[0].roomid });
	await rpc('confirm_reservation', {
		p_reservationid: arriving.reservationid,
		p_confirmed: true,
		p_date: day
	});
	leaving = await makeReservation({ arrival: start, departure: day, roomid: rooms[1].roomid });
	cancelled = await makeReservation({ arrival: addDays(start, 5), nights: 1, roomid: null });
	await cancel(cancelled, 'none', day);
	await openBatch(day);
	await page.locator('[data-testid=group-cancellation_notice]').waitFor({ timeout: 15_000 });
});

describe('batch print the daily print run', () => {
	it('gathers the day’s reports and every kind of queued guest document', async () => {
		const body = await page.textContent('body');
		expect(body).toContain('Housekeeping Report');
		expect(body).toContain('In House Report');
		expect(await page.locator('[data-testid=group-reports] .report-page').count()).toBe(4);
		const holds = async (key: string) =>
			page.textContent(`[data-testid=group-${key}] .report-page`);
		expect(await holds('confirmation')).toContain(String(arriving.resnumber));
		expect(await holds('check_in_folio')).toContain(String(arriving.resnumber));
		expect(await holds('checkout_bill')).toContain(String(leaving.resnumber));
		expect(await holds('cancellation_notice')).toContain(String(cancelled.resnumber));
	});

	it('shows how many pages are ready, broken down by type', async () => {
		expect(await page.textContent('.no-print')).toContain(
			'8 pages ready: 4 reports · 1 confirmation · 1 folio · 1 bill · 1 cancellation'
		);
	});

	it('prints the daily reports together on letter paper', async () => {
		expect(await page.textContent('[data-testid=group-reports] .batch-heading')).toMatch(
			/Reports · letter · 4 pages/
		);
		const rules = await rulesWhenPrinting(page, 'print-reports');
		expect(rules).toContain('size: letter');
		expect(rules).toContain('.batch-group:not([data-group="reports"]) { display: none');
	});

	it('prints each kind of guest document on its own, on folio paper', async () => {
		for (const key of DOCS) {
			const group = `[data-testid=group-${key}]`;
			expect(await page.locator(`${group} .report-page`).count(), key).toBe(1);
			const heading = (await page.textContent(`${group} .batch-heading`))?.trim();
			expect(heading, key).toMatch(/· A5 · 1 page$/);
			const rules = await rulesWhenPrinting(page, `print-${key}`);
			expect(rules, key).toContain('size: A5');
			// Only that group goes with it.
			expect(rules, key).toContain(`.batch-group:not([data-group="${key}"]) { display: none`);
		}
		const labels = await page
			.locator('[data-testid^=print-]')
			.evaluateAll((els) => els.map((e) => e.textContent?.trim()));
		expect(labels).toEqual([
			'Reports',
			'Confirmations',
			'Check-in folios',
			'Check-out bills',
			'Cancellations'
		]);
	});

	it('gives each document in a group its own sheet', async () => {
		await page.emulateMedia({ media: 'print' });
		// Every page but a group's last breaks after it.
		const breaks = await page.locator('[data-testid=group-reports] .report-page').evaluateAll((els) =>
			els.map((e) => getComputedStyle(e).breakAfter)
		);
		await page.emulateMedia({ media: 'screen' });
		expect(breaks).toEqual(['page', 'page', 'page', 'auto']);
	});

	it('has nothing to print for a kind of document the day does not have', async () => {
		// The day after, the arriving stay is in house and nothing else happens.
		await openBatch(addDays(day, 1));
		expect(await page.locator('[data-testid=print-reports]').isDisabled()).toBe(false);
		for (const key of DOCS) {
			expect(await page.locator(`[data-testid=print-${key}]`).isDisabled(), key).toBe(true);
			expect(await page.locator(`[data-testid=group-${key}]`).count(), key).toBe(0);
		}
	});

	it('skips a document that fails to load and keeps the rest of the batch', async () => {
		await page.route('**/rest/v1/rpc/report_cancellation_notice*', (route) =>
			route.fulfill({ status: 500, body: '{"message":"unavailable"}' })
		);
		try {
			await openBatch(day);
			await page.locator('[data-testid=group-checkout_bill]').waitFor({ timeout: 15_000 });
			expect(await page.locator('[data-testid=group-cancellation_notice]').count()).toBe(0);
			expect(await page.textContent('.no-print')).toContain(
				'7 pages ready: 4 reports · 1 confirmation · 1 folio · 1 bill'
			);
		} finally {
			await page.unroute('**/rest/v1/rpc/report_cancellation_notice*');
		}
	});

	it('prints a document or report opened on its own on the paper it takes in the batch', async () => {
		for (const key of DOCS) {
			const fx = key === 'checkout_bill' ? leaving : key === 'cancellation_notice' ? cancelled : arriving;
			await page.goto(`${APP_URL}/reports/${ROUTES[key]}/${fx.resnumber}`, { waitUntil: 'networkidle' });
			expect(await pageRules(page), key).toContain('size: A5');
		}
		for (const report of ['housekeeping', 'in-house', 'kitchen', 'manual-sales', 'dcar']) {
			await page.goto(`${APP_URL}/reports/${report}?date=${day}`, { waitUntil: 'networkidle' });
			expect(await pageRules(page), report).toContain('size: letter');
		}
	});

	it('is reachable from the Print Center with a live summary', async () => {
		await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
		await page.fill('#print-date', day);
		await expect
			.poll(() => page.textContent('body'), { timeout: 10_000 })
			.toContain('4 daily reports · 1 confirmation · 1 folio · 1 bill · 1 cancellation');
		await page.click('a[href*="/print/batch"]');
		await page.waitForURL(`${APP_URL}/print/batch?date=${day}`, { timeout: 15_000 });
	});
});
