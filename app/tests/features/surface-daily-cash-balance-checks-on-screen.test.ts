// Story: spec/features/surface-daily-cash-balance-checks-on-screen.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { makeReservation, pay, postCharge, postRoomNights, type Fixture } from '../helpers/db';

let balancedDay: Fixture;
let unbalancedDay: Fixture;

const page = useAppPage();
const toolbar = () => page.locator('.no-print [data-slot=badge]').first();

beforeAll(async () => {
	// Balanced day: a deposit received is both an upper adjustment and a receipt.
	balancedDay = await makeReservation();
	await pay(balancedDay, 'Deposit (Received)', 250);
	// Unbalanced day: $324 of charges with no receipt, on their stay's
	// check-out day — a room, which Items Cashed Out leaves off, and an item.
	unbalancedDay = await makeReservation();
	await postRoomNights(unbalancedDay, 100);
	await postCharge(unbalancedDay, { quantity: 2, amount: 24 });
});

describe('surface daily cash balance checks on screen', () => {
	it('shows Balanced when the two sections agree', async () => {
		await page.goto(`${APP_URL}/reports/dcar?date=${balancedDay.arrival}`, {
			waitUntil: 'networkidle'
		});
		await expect.poll(() => toolbar().textContent()).toBe('Balanced ✓');
	});

	it('keeps the balance indicators out of the printed sheet', async () => {
		expect(await page.textContent('.report-page')).not.toMatch(/Balanced|Difference/);
	});

	it('shows the difference when the sections do not agree', async () => {
		await page.goto(`${APP_URL}/reports/dcar?date=${unbalancedDay.departure}`, {
			waitUntil: 'networkidle'
		});
		await expect.poll(() => toolbar().textContent()).toMatch(/^\s*Difference \$324\.00\s*$/);
	});

	it('states on each appendix that it agrees with the daily cash line', async () => {
		for (const [appendix, date] of [
			['deposits-received', balancedDay.arrival],
			['cashier-detail', balancedDay.arrival],
			// The deposit is applied, and the charge cashed out, at check-out.
			['deposits-applied', balancedDay.departure],
			['items-cashed-out', unbalancedDay.departure]
		]) {
			await page.goto(`${APP_URL}/reports/${appendix}?date=${date}`, { waitUntil: 'networkidle' });
			await expect
				.poll(() => page.textContent('.no-print'), { message: appendix })
				.toMatch(/Agrees with Daily Cash/);
			expect(await page.textContent('.report-page'), appendix).not.toMatch(/Agrees with/);
		}
	});
});
