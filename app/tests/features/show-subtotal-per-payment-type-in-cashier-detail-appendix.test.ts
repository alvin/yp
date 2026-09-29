// Story: spec/features/show-subtotal-per-payment-type-in-cashier-detail-appendix.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;
let page: Page;

beforeAll(async () => {
	fx = await makeReservation();
	for (const [type, amount] of [
		['Visa', 100],
		['Cash', 40]
	] as const) {
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Payment (Regular)',
			p_paymenttype: type,
			p_amount: amount,
			p_paymentdate: fx.arrival
		});
	}
	page = await openAppPage();
	await page.goto(`${APP_URL}/reports/cashier-detail?date=${fx.arrival}`, {
		waitUntil: 'networkidle'
	});
});

afterAll(async () => {
	await closeApp(page);
});

describe('show subtotal per payment type in cashier detail appendix', () => {
	it('prints a subtotal row per tender', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Visa Subtotal');
		expect(sheet).toContain('Cash Subtotal');
	});

	it('prints the final total row', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Total');
		expect(sheet).toContain('$140.00');
	});
});

describe('show subtotal per payment type in cashier detail appendix — subtotals from the lines', () => {
	interface CashRow {
		payment_type: string;
		pymt_category: string;
		amount: number;
		resnumber: number;
	}

	let cashFx: Fixture;
	let rows: CashRow[];

	beforeAll(async () => {
		cashFx = await makeReservation();
		for (const [type, amount] of [
			['Visa', 120],
			['Visa', 30],
			['Cash', 55]
		] as const) {
			await rpc('record_payment', {
				p_reservationguestid: cashFx.reservationguestid,
				p_paymentcategory: 'Payment (Regular)',
				p_paymenttype: type,
				p_amount: amount,
				p_paymentdate: cashFx.arrival
			});
		}
		rows = await rpc('report_cashier_detail', { p_date: cashFx.arrival });
	});

	it('orders receipts by tender so each type subtotals cleanly', () => {
		const types = rows.map((r) => r.payment_type);
		expect(types).toEqual(['Cash', 'Visa', 'Visa']);
	});

	it('subtotals each payment type from its lines', () => {
		const visa = rows.filter((r) => r.payment_type === 'Visa').reduce((s, r) => s + Number(r.amount), 0);
		expect(visa).toBe(150);
		const cash = rows.filter((r) => r.payment_type === 'Cash').reduce((s, r) => s + Number(r.amount), 0);
		expect(cash).toBe(55);
	});

	it('grand-totals to the day’s receipts', async () => {
		const total = rows.reduce((s, r) => s + Number(r.amount), 0);
		const receipts = await rpc<number>('report_dcar_receipts_total', { p_date: cashFx.arrival });
		expect(total).toBeCloseTo(Number(receipts), 2);
	});
});
