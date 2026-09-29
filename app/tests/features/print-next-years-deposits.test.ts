// Story: spec/features/print-next-years-deposits.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { isolatedDate, makeReservation, rpc, staffClient, unwrap } from '../helpers/db';

interface Month {
	month: string;
	deposits: number;
	received: number;
	refunded: number;
	kept: number;
	held: number;
}

let year: number;
let paid: string; // a date in `year`
let before: Month[];
let after: Month[];

const report = (y: number) => rpc<Month[]>('report_next_years_deposits', { p_year: y });

async function pay(rgid: number, category: string, amount: number, date: string) {
	await rpc('record_payment', {
		p_reservationguestid: rgid,
		p_paymentcategory: category,
		p_paymenttype: 'Visa',
		p_amount: amount,
		p_paymentdate: date
	});
}

beforeAll(async () => {
	paid = isolatedDate();
	year = Number(paid.slice(0, 4));
	before = await report(year);
	const nextYear = await makeReservation({ arrival: `${year + 1}-06-15`, nights: 2 });
	const thisYear = await makeReservation({ arrival: `${year}-12-20`, nights: 2 });
	await pay(nextYear.reservationguestid, 'Deposit (Received)', 100, paid);
	// The $0.00 deposit line Access added to new bookings; the app refuses one,
	// so it is written straight to the table as the import did.
	const db = await staffClient();
	unwrap(
		await db
			.from('payments')
			.insert({
				reservationguestid: nextYear.reservationguestid,
				paymentcategory: 'Deposit (Received)',
				paymenttype: 'Visa',
				paymentdate: paid,
				paymentamount: 0,
				paymentamountcdn: 0,
				paymentcurrency: 'Cdn dollars',
				paymentarchive: false
			})
			.select('paymentid')
	);
	await pay(nextYear.reservationguestid, 'Deposit (Refund)', 30, paid);
	await pay(thisYear.reservationguestid, 'Deposit (Received)', 500, paid);
	after = await report(year);
});

describe("print next year's deposits", () => {
	it('lists the twelve months of the chosen year', () => {
		expect(after.map((m) => m.month.slice(0, 7))).toEqual(
			Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
		);
	});

	it('counts the deposit taken for next year, less what was refunded, and not this year’s stay or a $0.00 line', () => {
		const i = Number(paid.slice(5, 7)) - 1;
		const change = (key: keyof Omit<Month, 'month'>) => Number(after[i][key]) - Number(before[i][key]);
		expect(change('deposits')).toBe(1);
		expect(change('received')).toBe(100);
		expect(change('refunded')).toBe(30);
		expect(change('kept')).toBe(0);
		expect(change('held')).toBe(70);
		// Nothing moved in any other month.
		after.forEach((m, j) => {
			if (j !== i) expect(Number(m.received)).toBe(Number(before[j].received));
		});
	});
});

describe("print next year's deposits — on paper", () => {
	let page: Page;

	beforeAll(async () => {
		page = await openAppPage();
	});

	afterAll(async () => {
		await closeApp(page);
	});

	it('opens from the Print Center and prints the year with its total held', async () => {
		await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
		await page.getByText("Next Year's Deposits").click();
		await page.waitForURL(/\/reports\/next-years-deposits\?year=\d{4}$/, { timeout: 15_000 });

		await page.goto(`${APP_URL}/reports/next-years-deposits?year=${year}`, { waitUntil: 'networkidle' });
		const sheet = (await page.textContent('.report-page')) ?? '';
		expect(sheet).toContain("Next Year's Deposits");
		expect(sheet).toContain(`for stays after ${year}`);
		const held = after.reduce((s, m) => s + Number(m.held), 0);
		const shown = held.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		expect(sheet).toContain(`Held at December 31, ${year}:`);
		expect(sheet).toContain(`$${shown}`);
	});
});
