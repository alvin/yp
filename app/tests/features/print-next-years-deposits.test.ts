// Story: spec/features/print-next-years-deposits.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { isolatedDate, makeReservation, pay, rpc, staffClient, todayISO, unwrap } from '../helpers/db';

interface Month {
	month: string;
	deposits: number;
	received: number;
	refunded: number;
	kept: number;
	held: number;
}

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

let year: number;
let paid: string; // a date in `year`
let before: Month[];
let after: Month[];
let rangeBefore: Month[];
let rangeAfter: Month[];

const report = (from: string, to: string) =>
	rpc<Month[]>('report_next_years_deposits', { p_from: from, p_to: to });
const calendarYear = (y: number) => report(`${y}-01-01`, `${y}-12-31`);

const sumOf = (rows: Month[], key: keyof Omit<Month, 'month'>) =>
	rows.reduce((s, m) => s + Number(m[key]), 0);
const money = (n: number) =>
	`$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

beforeAll(async () => {
	paid = isolatedDate();
	year = Number(paid.slice(0, 4));
	before = await calendarYear(year);
	rangeBefore = await report(paid, paid);
	// Without rooms: these stays fall on dates other tests may own.
	const nextYear = await makeReservation({ arrival: `${year + 1}-06-15`, nights: 2, roomid: null });
	const thisYear = await makeReservation({ arrival: `${year}-12-31`, nights: 2, roomid: null });
	await pay(nextYear, 'Deposit (Received)', 100, { date: paid });
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
	await pay(nextYear, 'Deposit (Refund)', 30, { date: paid });
	await pay(thisYear, 'Deposit (Received)', 500, { date: paid });
	after = await calendarYear(year);
	rangeAfter = await report(paid, paid);
});

describe("print next year's deposits", () => {
	it('lists each month of the range', async () => {
		expect(after.map((m) => m.month.slice(0, 7))).toEqual(
			Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
		);
		const across = await report(`${year}-11-15`, `${year + 1}-02-10`);
		expect(across.map((m) => m.month)).toEqual([
			`${year}-11-01`,
			`${year}-12-01`,
			`${year + 1}-01-01`,
			`${year + 1}-02-01`
		]);
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

	it('counts a stay arriving after a shorter range, though within the year', () => {
		const change = (key: keyof Omit<Month, 'month'>) =>
			sumOf(rangeAfter, key) - sumOf(rangeBefore, key);
		// This year's stay arrives on December 31: after the range, unless the
		// deposits were taken that very day.
		const thisYearCounts = `${year}-12-31` > paid;
		expect(rangeAfter).toHaveLength(1);
		expect(change('deposits')).toBe(thisYearCounts ? 2 : 1);
		expect(change('received')).toBe(thisYearCounts ? 600 : 100);
		expect(change('held')).toBe(thisYearCounts ? 570 : 70);
	});
});

describe("print next year's deposits — on paper", () => {
	const page = useAppPage(undefined, 'admin');

	it('is the admin area’s Year End Deposits, January 1 to December 31 of this year to start with', async () => {
		await page
			.getByRole('navigation', { name: 'Admin' })
			.getByRole('link', { name: 'Year End Deposits' })
			.click();
		await page.waitForURL(`${APP_URL}/admin/year-end-deposits`);
		const thisYear = todayISO().slice(0, 4);
		await page.locator('.report-page h1').waitFor();
		expect(await page.inputValue('#deposits-from')).toBe(`${thisYear}-01-01`);
		expect(await page.inputValue('#deposits-to')).toBe(`${thisYear}-12-31`);
		expect(await page.textContent('.report-page h3')).toBe(
			`Received January 1 – December 31, ${thisYear}, for stays after ${thisYear}`
		);
	});

	it('prints a year with its total held, and any other range by its dates', async () => {
		await page.goto(`${APP_URL}/admin/year-end-deposits?from=${year}-01-01&to=${year}-12-31`, {
			waitUntil: 'networkidle'
		});
		let sheet = (await page.textContent('.report-page')) ?? '';
		expect(sheet).toContain("Next Year's Deposits");
		expect(sheet).toContain(`for stays after ${year}`);
		expect(sheet).toContain(`Held at December 31, ${year}:`);
		expect(sheet).toContain(money(sumOf(after, 'held')));

		await page.locator('#deposits-from').fill(paid);
		await page.locator('#deposits-from').dispatchEvent('change');
		await page.waitForURL(new RegExp(`from=${paid}&to=${year}-12-31`));
		await page.locator('#deposits-to').fill(paid);
		await page.locator('#deposits-to').dispatchEvent('change');
		await page.waitForURL(new RegExp(`from=${paid}&to=${paid}$`));
		await page.locator('.report-page h3', { hasText: 'for stays after' }).waitFor();
		const day = `${MONTHS[Number(paid.slice(5, 7)) - 1]} ${Number(paid.slice(8, 10))}, ${year}`;
		expect(await page.textContent('.report-page h3')).toBe(
			`Received ${day} – ${day}, for stays after ${day}`
		);
		sheet = (await page.textContent('.report-page')) ?? '';
		expect(sheet).toContain(`Held at ${day}:`);
		expect(sheet).toContain(money(sumOf(rangeAfter, 'held')));
	});

	it('is no longer in the Print Center', async () => {
		await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
		await page.getByText('Operational reports', { exact: true }).waitFor();
		expect(await page.getByText("Next Year's Deposits").count()).toBe(0);
	});
});
