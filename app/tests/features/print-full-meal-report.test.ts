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
		const total = await rpc<number>('report_kitchen_meal_total_guests', { p_date: mid });
		expect(Number(total)).toBeGreaterThan(0);
		await page.goto(`${APP_URL}/reports/kitchen?date=${mid}`, { waitUntil: 'networkidle' });
		expect(await page.textContent('.report-page')).toContain('Total Guests');
	});

	it('prints under the lodge blackbar heading', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Yellow Point Lodge');
		expect(sheet).toContain('Kitchen/Meal Report');
	});
});
