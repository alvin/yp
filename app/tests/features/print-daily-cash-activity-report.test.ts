// Story: spec/features/print-daily-cash-activity-report.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

let fx: Fixture;
let page: Page;

beforeAll(async () => {
	fx = await makeReservation();
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('print daily cash activity report', () => {
	it('offers a print action on the daily cash report', async () => {
		await page.goto(`${APP_URL}/reports/dcar?date=${fx.arrival}`, { waitUntil: 'networkidle' });
		expect(await page.isVisible('button:has-text("Print")')).toBe(true);
	});

	it('prints the report for the selected business date', async () => {
		const sheet = await page.textContent('.report-page h1');
		expect(sheet).toContain('Daily Cash Activity Report for');
	});

	it('keeps the manual-entry columns on the printed sheet', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain('Adjustments:');
		expect(sheet).toContain('Actual Amount:');
	});
});

describe('print daily cash activity report — the two balancing sections', () => {
	let dayFx: Fixture;
	let sectionsPage: Page;

	beforeAll(async () => {
		dayFx = await makeReservation();
		await rpc('post_room_nights', {
			p_reservationguestid: dayFx.reservationguestid,
			p_roomid: (await rpc<{ roomid: number }[]>('room_directory'))[0].roomid,
			p_occupancyin: dayFx.arrival,
			p_occupancyout: dayFx.departure,
			p_rate: 100,
			p_transdate: dayFx.arrival
		});
		await rpc('record_payment', {
			p_reservationguestid: dayFx.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: 'Visa',
			p_amount: 80,
			p_paymentdate: dayFx.arrival
		});
		sectionsPage = await openAppPage();
	});

	afterAll(async () => {
		await closeApp(sectionsPage);
	});

	it('summarizes the day’s activity in two balancing sections', async () => {
		const summary = await rpc<{ upper_total: number; receipts_total: number }[]>(
			'report_dcar_summary',
			{ p_date: dayFx.arrival }
		);
		expect(Number(summary[0].upper_total)).toBeGreaterThan(0);
		expect(Number(summary[0].receipts_total)).toBe(80);
	});

	it('renders the printed sheet with both sections for the chosen date', async () => {
		await sectionsPage.goto(`${APP_URL}/reports/dcar?date=${dayFx.arrival}`, {
			waitUntil: 'networkidle'
		});
		const sheet = await sectionsPage.textContent('.report-page');
		expect(sheet).toContain('Daily Cash Activity Report');
		expect(sheet).toContain('Total Sales and Charges:');
		expect(sheet).toContain('Type of Cash:');
		expect(sheet).toContain('Total Receipts Today:');
		expect(sheet).toContain('Balance Owed:');
	});
});

describe('print daily cash activity report — every line the totals count', () => {
	it('gives a payment type or charge category missing from the lodge lists its own line', async () => {
		const day = await makeReservation();
		const date = day.arrival;
		await rpc('record_payment', {
			p_reservationguestid: day.reservationguestid,
			p_paymentcategory: 'Payment (Regular)',
			p_paymenttype: 'Discover',
			p_amount: 25,
			p_paymentdate: date
		});
		const db = await staffClient();
		const [item] = unwrap(
			await db.from('inventory_items').select('inventoryid').eq('invarchive', false).limit(1)
		) as { inventoryid: number }[];
		await rpc('post_charge', {
			p_reservationguestid: day.reservationguestid,
			p_inventoryid: item.inventoryid,
			p_quantity: 1,
			p_transdate: date,
			p_amount: 10,
			p_transtype: 'Unlisted category'
		});

		const payments = await rpc<{ paymenttype: string; calc_amount: number }[]>(
			'report_dcar_payments',
			{ p_date: date }
		);
		expect(Number(payments.find((l) => l.paymenttype === 'Discover')?.calc_amount)).toBe(25);
		const receipts = await rpc<number>('report_dcar_receipts_total', { p_date: date });
		const lines = payments.reduce((sum, l) => sum + Number(l.calc_amount), 0);
		expect(lines).toBeCloseTo(Number(receipts), 2);

		const upper = await rpc<{ group_name: string; item: string; amount: number }[]>(
			'report_dcar_upper',
			{ p_date: date }
		);
		const revenue = upper.filter((l) => l.group_name === 'Revenue');
		expect(Number(revenue.find((l) => l.item === 'Unlisted category')?.amount)).toBe(10);
		const total = revenue.find((l) => l.item === 'Total Sales and Charges')!;
		const items = revenue.filter((l) => l !== total).reduce((sum, l) => sum + Number(l.amount), 0);
		expect(items).toBeCloseTo(Number(total.amount), 2);
		expect(Number(total.amount)).toBe(10);
	});
});
