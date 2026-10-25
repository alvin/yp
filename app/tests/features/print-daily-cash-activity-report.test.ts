// Story: spec/features/print-daily-cash-activity-report.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import {
	addDays,
	dcarLine,
	insertTaxedCharge,
	makeReservation,
	pay,
	postCharge,
	postRoomNights,
	rpc,
	type Fixture
} from '../helpers/db';

interface UpperRow {
	group_name: string;
	item: string;
	amount: number;
}

interface Summary {
	upper_total: number;
	receipts_total: number;
	balance_owed: number;
	manual_adjustments_stored: boolean;
}

const summary = async (date: string) =>
	(await rpc<Summary[]>('report_dcar_summary', { p_date: date }))[0];

function longDate(iso: string): string {
	const [y, m, d] = iso.split('-').map(Number);
	const month = new Date(Date.UTC(2000, m - 1, 1)).toLocaleString('en-US', {
		month: 'long',
		timeZone: 'UTC'
	});
	return `${month} ${d}, ${y}`;
}

describe('print daily cash activity report — the sheet', () => {
	// A stay checking out on its own day: three room nights at $100, an extra
	// carrying $7.50 GST, a $40 deposit taken earlier and $300 paid at the desk.
	let stay: Fixture;

	const page = useAppPage();

	beforeAll(async () => {
		stay = await makeReservation();
		await postRoomNights(stay, 100);
		await insertTaxedCharge(stay, 50, { transgstamount: 7.5 });
		await pay(stay, 'Deposit (Received)', 40, { date: addDays(stay.arrival, -1) });
		await pay(stay, 'Payment (Regular)', 300, { type: 'Cash', date: stay.departure });
		await page.goto(`${APP_URL}/reports/dcar?date=${stay.departure}`, { waitUntil: 'networkidle' });
	});

	it('opens for the chosen date and prints it in the heading', async () => {
		await expect
			.poll(() => page.textContent('.report-page h1'))
			.toBe(`Daily Cash Activity Report for ${longDate(stay.departure)}`);
	});

	it('runs sales and charges, then taxes, then adjustments, to the day’s revenue and expenses', async () => {
		const upper = await rpc<UpperRow[]>('report_dcar_upper', { p_date: stay.departure });
		const groups = upper.map((r) => r.group_name).filter((g, i, all) => all.indexOf(g) === i);
		expect(groups).toEqual(['Revenue', 'Taxes', 'Adjustments']);
		const line = (item: string) => Number(upper.find((r) => r.item === item)?.amount);
		expect(line('Room')).toBe(300);
		expect(line('Sundries')).toBe(50);
		expect(line('Total Sales and Charges')).toBe(350);
		expect(line('GST')).toBe(7.5);
		expect(line('Total Taxes')).toBe(7.5);
		expect(line('Deposit (Applied)')).toBe(-40);
		expect(Number((await summary(stay.departure)).upper_total)).toBe(317.5);

		const sheet = (await page.textContent('.report-page')) ?? '';
		expect(sheet.indexOf('Total Sales and Charges:')).toBeLessThan(sheet.indexOf('Total Taxes:'));
		expect(sheet.indexOf('Total Taxes:')).toBeLessThan(sheet.indexOf('Deposit (Applied)'));
		expect(sheet).toMatch(/Today's Revenue and Expenses:\s*\$317\.50/);
	});

	it('lists the receipts by type of cash, then the day’s receipts and the balance owed', async () => {
		const sheet = (await page.textContent('.report-page')) ?? '';
		expect(sheet).toMatch(/Cash\s*\$300\.00/);
		expect(sheet).toMatch(/Total Receipts Today:\s*\$300\.00/);
		expect(sheet).toMatch(/Balance Owed:\s*\$17\.50/);
		expect(sheet.indexOf('Type of Cash:')).toBeLessThan(sheet.indexOf('Total Receipts Today:'));
		expect(sheet.indexOf('Total Receipts Today:')).toBeLessThan(sheet.indexOf('Balance Owed:'));
	});

	it('keeps the hand-filled columns, printed empty, and stores no hand adjustment', async () => {
		const [upperHead, lowerHead] = await page.locator('.report-page table thead').allTextContents();
		expect(upperHead).toContain('Adjustments:');
		expect(lowerHead).toContain('Actual Amount:');
		expect(lowerHead).toContain('Adjustments:');
		// Both tables carry their hand-filled columns from the third on.
		const handColumns = await page.$$eval('.report-page table tbody tr', (rows) =>
			rows.flatMap((row) =>
				Array.from(row.children)
					.slice(2)
					.map((cell) => (cell as HTMLElement).innerText.trim())
			)
		);
		expect(handColumns.length).toBeGreaterThan(20);
		expect(handColumns.every((c) => c === '')).toBe(true);
		expect((await summary(stay.departure)).manual_adjustments_stored).toBe(false);
	});

	it('sends the report to paper from its print action', async () => {
		await page.evaluate(() => {
			const w = window as unknown as { __printed?: number };
			w.__printed = 0;
			window.print = () => {
				w.__printed = (w.__printed ?? 0) + 1;
			};
		});
		await page.getByRole('button', { name: 'Print', exact: true }).click();
		expect(await page.evaluate(() => (window as unknown as { __printed?: number }).__printed)).toBe(1);
	});
});

describe('print daily cash activity report — every line the totals count', () => {
	it('gives a payment type or charge category missing from the lodge lists its own line', async () => {
		const day = await makeReservation();
		const date = day.arrival;
		await pay(day, 'Payment (Regular)', 25, { type: 'Discover' });
		await postCharge(day, { amount: 10, transtype: 'Unlisted category' });

		const payments = await rpc<{ paymenttype: string; calc_amount: number }[]>(
			'report_dcar_payments',
			{ p_date: date }
		);
		expect(Number(payments.find((l) => l.paymenttype === 'Discover')?.calc_amount)).toBe(25);
		const lines = payments.reduce((sum, l) => sum + Number(l.calc_amount), 0);
		expect(lines).toBe(25);
		expect(Number(await rpc('report_dcar_receipts_total', { p_date: date }))).toBe(25);

		// The charge reaches the sheet with its stay's check-out.
		expect(await dcarLine(day.departure, 'Unlisted category', 'Revenue')).toBe(10);
		expect(await dcarLine(day.departure, 'Total Sales and Charges')).toBe(10);
	});
});

describe('print daily cash activity report — a stay counts on its check-out day', () => {
	let stay: Fixture;
	let late: string;

	beforeAll(async () => {
		stay = await makeReservation();
		await pay(stay, 'Deposit (Received)', 100);
		await postRoomNights(stay, 100);
		await postCharge(stay, { amount: 20, transdate: addDays(stay.arrival, 1) });
		// The guest settles at check-out: the charges, less the deposit.
		await pay(stay, 'Payment (Regular)', 220, { date: stay.departure });
		late = addDays(stay.departure, 1);
		await postCharge(stay, { amount: 15, transdate: late });
	});

	it('counts none of the stay’s charges before the guest checks out', async () => {
		expect(await dcarLine(stay.arrival, 'Total Sales and Charges')).toBe(0);
		expect(await dcarLine(addDays(stay.arrival, 1), 'Total Sales and Charges')).toBe(0);
	});

	it('counts them on the check-out day, where the day balances', async () => {
		expect(await dcarLine(stay.departure, 'Total Sales and Charges')).toBe(320);
		const day = await summary(stay.departure);
		expect(Number(day.upper_total)).toBe(220);
		expect(Number(day.balance_owed)).toBe(0);
	});

	it('takes as receipts only the money taken that day', async () => {
		expect(Number(await rpc('report_dcar_receipts_total', { p_date: stay.arrival }))).toBe(100);
		expect(Number(await rpc('report_dcar_receipts_total', { p_date: stay.departure }))).toBe(220);
	});

	it('counts a charge posted after check-out on the day it is posted', async () => {
		expect(await dcarLine(late, 'Total Sales and Charges')).toBe(15);
	});
});
