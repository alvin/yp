// Story: spec/features/print-full-meal-report.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;
let mid: string;
let page: Page;

beforeAll(async () => {
	fx = await makeReservation();
	mid = addDays(fx.arrival, 1);
	await rpc('save_kitchen_meal', {
		p_guestid: fx.guestid,
		p_guestdiet: 'Vegetarian - Seafood OK',
		p_notes: 'Prefers early dinner.'
	});
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('print full meal report', () => {
	it('prints every in-house dietary need for the day', async () => {
		const rows = await rpc<{ resnumber: number; diet_notes: string }[]>('report_kitchen_meal', {
			p_date: mid
		});
		const mine = rows.find((r) => r.resnumber === fx.resnumber)!;
		expect(mine.diet_notes).toContain('Vegetarian - Seafood OK');
	});

	it('totals the guests in house for the kitchen', async () => {
		// The date is this test's alone: one party of two.
		expect(await rpc<number>('guests_in_house', { p_date: mid })).toBe(2);
		await page.goto(`${APP_URL}/reports/kitchen?date=${mid}`, { waitUntil: 'networkidle' });
		expect(await page.textContent('.report-page')).toMatch(/Total Guests\D*2\b/);
	});

	it('prints under the lodge blackbar heading', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Yellow Point Lodge');
		expect(sheet).toContain('Kitchen/Meal Report');
	});
});

describe('print full meal report — rows for the day', () => {
	let rowFx: Fixture;
	let rowMid: string;
	let rows: { resnumber: number; guest: string; arrival_date: string; departure_date: string; diet_notes: string }[];

	beforeAll(async () => {
		rowFx = await makeReservation();
		rowMid = addDays(rowFx.arrival, 1);
		await rpc('save_kitchen_meal', {
			p_guestid: rowFx.guestid,
			p_guestdiet: 'Vegetarian',
			p_notes: 'No mushrooms.'
		});
		rows = await rpc('report_kitchen_meal', { p_date: rowMid });
	});

	it('lists in-house guests with dietary needs for the day', () => {
		const mine = rows.find((r) => r.resnumber === rowFx.resnumber);
		expect(mine).toBeDefined();
		expect(mine!.guest).toContain(rowFx.lastname);
	});

	it('carries the diet and meal notes together', () => {
		const mine = rows.find((r) => r.resnumber === rowFx.resnumber)!;
		expect(mine.diet_notes).toContain('Vegetarian');
		expect(mine.diet_notes).toContain('No mushrooms.');
	});

	it('shows the stay dates for kitchen planning', () => {
		const mine = rows.find((r) => r.resnumber === rowFx.resnumber)!;
		expect(mine.arrival_date).toBe(rowFx.arrival);
		expect(mine.departure_date).toBe(rowFx.departure);
	});
});
