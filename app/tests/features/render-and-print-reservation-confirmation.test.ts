// Story: spec/features/render-and-print-reservation-confirmation.feature
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
		p_amount: 95,
		p_paymentdate: fx.arrival
	});
	await rpc('set_reservation_notes', {
		p_reservationid: fx.reservationid,
		p_notes: 'Anniversary — flowers in room.'
	});
	page = await openAppPage();
	await page.goto(`${APP_URL}/reports/confirmation/${fx.resnumber}`, {
		waitUntil: 'networkidle'
	});
});

afterAll(async () => {
	await closeApp(page);
});

describe('render and print reservation confirmation', () => {
	it('renders the slip with the guest block and reservation number', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet?.toUpperCase()).toContain(fx.lastname.toUpperCase());
		expect(sheet).toContain(`Res. No. ${fx.resnumber}`);
	});

	it('shows arrival, departure, room, and guest count', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Arrival:');
		expect(sheet).toContain('Departure:');
		expect(sheet).toContain('Room:');
		expect(sheet).toContain('# Guests');
	});

	it('shows the deposit line and the reservation message', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Deposit (Received)');
		expect(sheet).toContain('$95.00');
		expect(sheet).toContain('Anniversary — flowers in room.');
	});

	it('closes with the lodge phone and offers a print action', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Phone (250) 245-7422');
		expect(await page.isVisible('button:has-text("Print")')).toBe(true);
	});
});
