// Story: spec/features/show-manual-sales-list.feature
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
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('show manual sales list', () => {
	it('lists occupied rooms with reservation and guest for the day', async () => {
		const rows = await rpc<
			{ room: string; resnumber: number; guest_last_name: string; room_order: number }[]
		>('report_manual_sales', { p_date: mid });
		const mine = rows.find((r) => r.resnumber === fx.resnumber)!;
		expect(mine.guest_last_name).toBe(fx.lastname);
		expect(mine.room).toBeTruthy();
		expect(mine.room_order).not.toBeNull();
	});

	it('prints as the Manual Sales List with the checkbox convention', async () => {
		await page.goto(`${APP_URL}/reports/manual-sales?date=${mid}`, { waitUntil: 'networkidle' });
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Manual Sales List');
		expect(sheet).toContain('☐');
		expect(sheet).toMatch(/Checkbox beside Res #/);
	});
});
