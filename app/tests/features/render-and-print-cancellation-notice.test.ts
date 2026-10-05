// Story: spec/features/render-and-print-cancellation-notice.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

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
	it('renders the CANCELLATION heading with the guest block', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('CANCELLATION');
		expect(sheet?.toUpperCase()).toContain(fx.lastname.toUpperCase());
	});

	it('shows the cancelled stay dates and cancellation date', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Date Cancelled:');
		expect(sheet).toContain('Arrival:');
	});

	it('shows the deposit received and its outcome', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Deposit (Received)');
		expect(sheet).toContain('Deposit (Refund)');
	});

	it('offers the print action', async () => {
		expect(await page.isVisible('button:has-text("Print")')).toBe(true);
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
