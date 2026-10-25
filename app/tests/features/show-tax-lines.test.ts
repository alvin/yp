// Story: spec/features/show-tax-lines.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { dcarLine, insertTaxedCharge, makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;

const page = useAppPage();

beforeAll(async () => {
	// Two charges on a stay checking out on a day of its own, with exact taxes.
	fx = await makeReservation();
	await insertTaxedCharge(fx, 100, { transgstamount: 5, transpstamount: 7 });
	await insertTaxedCharge(fx, 40, { transgstamount: 2, transltamount: 4 });
});

describe('show tax lines', () => {
	it('totals each tax on the charges the day counts, and Total Taxes adds them up', async () => {
		expect(await dcarLine(fx.departure, 'GST', 'Taxes')).toBe(7);
		expect(await dcarLine(fx.departure, 'PST', 'Taxes')).toBe(7);
		expect(await dcarLine(fx.departure, 'Liquor Tax', 'Taxes')).toBe(4);
		expect(await dcarLine(fx.departure, 'Total Taxes', 'Taxes')).toBe(18);
	});

	it('counts the taxes toward the day’s revenue and expenses', async () => {
		const [day] = await rpc<{ upper_total: number }[]>('report_dcar_summary', {
			p_date: fx.departure
		});
		expect(Number(day.upper_total)).toBe(158);
	});

	it('prints a line for every tax by its rate type, even at zero', async () => {
		await page.goto(`${APP_URL}/reports/dcar?date=${fx.departure}`, { waitUntil: 'networkidle' });
		const lines = await page.$$eval('.report-page table:first-of-type tbody tr', (rows) =>
			rows.map((r) => Array.from(r.children).slice(0, 2).map((c) => (c as HTMLElement).innerText.trim()))
		);
		const taxes = lines.slice(
			lines.findIndex(([item]) => item === 'GST:'),
			lines.findIndex(([item]) => item === 'Total Taxes:') + 1
		);
		expect(taxes).toEqual([
			['GST:', '$7.00'],
			['PST:', '$7.00'],
			['HST:', '$0.00'],
			['Liquor Tax:', '$4.00'],
			['Room Tax:', '$0.00'],
			['Other Tax:', '$0.00'],
			['Dest Mktg Tax:', '$0.00'],
			['Total Taxes:', '$18.00']
		]);
	});
});
