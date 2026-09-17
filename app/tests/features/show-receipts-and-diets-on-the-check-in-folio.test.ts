// Story: spec/features/show-receipts-and-diets-on-the-check-in-folio.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

interface Receipt {
	category: string;
	paymenttype: string | null;
	amount: number;
}

function receipts(reservationid: number): Promise<Receipt[]> {
	return rpc<Receipt[]>('report_folio_receipts', { p_reservationid: reservationid });
}

let full: Fixture; // deposit + prepayment + gift certificate + a diet
let plain: Fixture; // a deposit and nothing else

beforeAll(async () => {
	full = await makeReservation();
	for (const [category, type, amount] of [
		['Deposit (Received)', 'Visa', 100],
		['Prepayment (Received)', 'Cheque', 250],
		['Gift Certificate Received', 'Gift Certificate', 50]
	] as const) {
		await rpc('record_payment', {
			p_reservationguestid: full.reservationguestid,
			p_paymentcategory: category,
			p_paymenttype: type,
			p_amount: amount,
			p_paymentdate: full.arrival
		});
	}
	await rpc('save_kitchen_meal', {
		p_guestid: full.guestid,
		p_guestdiet: 'Vegetarian',
		p_notes: 'No shellfish'
	});

	plain = await makeReservation();
	await rpc('record_payment', {
		p_reservationguestid: plain.reservationguestid,
		p_paymentcategory: 'Deposit (Received)',
		p_paymenttype: 'Visa',
		p_amount: 75,
		p_paymentdate: plain.arrival
	});
});

describe('show receipts and diets on the check-in folio', () => {
	it('lists every receipt held against the stay, not the deposit alone', async () => {
		const rows = await receipts(full.reservationid);
		expect(rows.map((r) => r.category).sort()).toEqual([
			'Deposit (Received)',
			'Gift Certificate Received',
			'Prepayment (Received)'
		]);
	});

	it('names a prepayment and a gift certificate for what they are', async () => {
		const rows = await receipts(full.reservationid);
		const prepayment = rows.find((r) => r.category === 'Prepayment (Received)')!;
		expect(Number(prepayment.amount)).toBe(250);
		const certificate = rows.find((r) => r.category === 'Gift Certificate Received')!;
		expect(Number(certificate.amount)).toBe(50);
	});

	it('shows the diet the kitchen holds for the party', async () => {
		const folio = (
			await rpc<{ diet_notes: string | null }[]>('report_check_in_folio', {
				p_reservationid: full.reservationid
			})
		)[0];
		expect(folio.diet_notes).toContain('Vegetarian');
		expect(folio.diet_notes).toContain('No shellfish');
	});

	it('leaves a stay with only a deposit and no diet as it was', async () => {
		const rows = await receipts(plain.reservationid);
		expect(rows).toHaveLength(1);
		expect(rows[0].category).toBe('Deposit (Received)');
		const folio = (
			await rpc<{ diet_notes: string | null }[]>('report_check_in_folio', {
				p_reservationid: plain.reservationid
			})
		)[0];
		expect(folio.diet_notes).toBeNull();
	});
});

describe('show receipts and diets on the check-in folio — on paper', () => {
	let page: Page;

	beforeAll(async () => {
		page = await openAppPage();
		await page.goto(`${APP_URL}/reports/check-in-folio/${full.resnumber}`, {
			waitUntil: 'networkidle'
		});
	});

	afterAll(async () => {
		await closeApp(page);
	});

	it('prints the receipts and the diet on the folio', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Deposit (Received)');
		expect(sheet).toContain('Prepayment (Received)');
		expect(sheet).toContain('Gift Certificate Received');
		expect(sheet).toContain('$250.00');
		expect(sheet).toContain('Diet:');
		expect(sheet).toContain('Vegetarian');
	});
});
