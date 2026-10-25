// Story: spec/features/render-and-print-cancellation-notice.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage, printedDate } from '../helpers/app';
import { makeReservation, rpc, todayISO, type Fixture } from '../helpers/db';

let fx: Fixture;
let page: Page;

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: 'Deposit (Received)',
		p_paymenttype: 'Visa',
		p_amount: 130,
		p_paymentdate: fx.arrival
	});
	await rpc('cancel_reservation', {
		p_reservationid: fx.reservationid,
		p_date: fx.arrival,
		p_deposit_handling: 'refund'
	});
	page = await openAppPage();
	await page.goto(`${APP_URL}/reports/cancellation/${fx.resnumber}`, {
		waitUntil: 'networkidle'
	});
});

afterAll(async () => {
	await closeApp(page);
});

describe('render and print cancellation notice', () => {
	let sheet: string;

	beforeAll(async () => {
		sheet = (await page.textContent('.report-page')) ?? '';
	});

	it('states the cancellation, with the guest, the number and the date cancelled', () => {
		expect(sheet).toContain('CANCELLATION');
		expect(sheet.toUpperCase()).toContain(fx.lastname.toUpperCase());
		expect(sheet).toContain(`Res. No. ${fx.resnumber}`);
		expect(sheet).toContain(`Date Cancelled: ${printedDate(fx.arrival)}`);
		expect(sheet).toContain(`Date Printed: ${printedDate(todayISO())}`);
	});

	it('shows the stay that was cancelled', () => {
		expect(sheet).toContain(`Arrival: ${printedDate(fx.arrival)}`);
		expect(sheet).toContain(`Departure: ${printedDate(fx.departure)}`);
		expect(sheet).toMatch(/# Guests\s*2\b/);
	});

	it('shows the deposit received and what became of it', () => {
		expect(sheet).toMatch(/Deposit \(Received\)\s*\$130\.00/);
		expect(sheet).toMatch(/Deposit \(Refund\)\s*\(\$130\.00\)/);
	});

	it('prints from its own screen', async () => {
		expect(await page.getByRole('button', { name: 'Print' }).isVisible()).toBe(true);
	});
});

describe('render and print cancellation notice — only for a cancelled reservation', () => {
	let active: Fixture;
	let screen: Page;

	beforeAll(async () => {
		active = await makeReservation();
		screen = await openAppPage();
	});

	afterAll(async () => {
		await closeApp(screen);
	});

	it('has no notice for a reservation that is not cancelled', async () => {
		expect(
			await rpc<unknown[]>('report_cancellation_notice', { p_reservationid: active.reservationid })
		).toEqual([]);
		await screen.goto(`${APP_URL}/reports/cancellation/${active.resnumber}`, {
			waitUntil: 'networkidle'
		});
		expect(await screen.textContent('body')).toContain(
			'Cancellation notice is not available for this reservation'
		);
	});

	it('offers the notice on the reservation screen once it is cancelled, and not before', async () => {
		const notice = (resnumber: number) =>
			screen.locator(`a[href="/reports/cancellation/${resnumber}"]`);
		await screen.goto(`${APP_URL}/reservations/${active.resnumber}`, { waitUntil: 'networkidle' });
		await expect
			.poll(() => screen.locator(`a[href="/reports/confirmation/${active.resnumber}"]`).count(), {
				timeout: 10_000
			})
			.toBeGreaterThan(0);
		expect(await notice(active.resnumber).count()).toBe(0);

		await screen.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		await expect
			.poll(() => notice(fx.resnumber).count(), { timeout: 10_000 })
			.toBeGreaterThan(0);
	});
});
