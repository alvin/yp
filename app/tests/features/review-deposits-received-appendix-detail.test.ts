// Story: spec/features/review-deposits-received-appendix-detail.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { dcarLine, makeReservation, pay, rpc, type Fixture } from '../helpers/db';

interface DepositRow {
	payment_type: string;
	resnumber: number;
	guestlastname: string;
	guestfirstname: string | null;
	pymt_amount: number;
	funds: string;
	pymt_cdn: number;
}

let fx: Fixture;
let rows: DepositRow[];

const page = useAppPage();

beforeAll(async () => {
	fx = await makeReservation({ firstname: 'Dana' });
	// Taken out of type order, so the grouping can only come from the report.
	await pay(fx, 'Deposit (Received)', 100, { type: 'Visa' });
	await pay(fx, 'Deposit (Received)', 50, { type: 'Cash' });
	await pay(fx, 'Deposit (Received)', 80, { type: 'Visa' });
	rows = await rpc('report_deposits_received', { p_date: fx.arrival });
});

describe('review deposits received appendix detail', () => {
	it('groups the lines by payment type, each with its reservation, guest, amount, funds and Canadian value', () => {
		expect(rows.map((r) => r.payment_type)).toEqual(['Cash', 'Visa', 'Visa']);
		// Two lines of one type on one stay come in no particular order.
		expect(
			rows.map((r) => [
				r.payment_type,
				r.resnumber,
				r.guestlastname,
				r.guestfirstname,
				Number(r.pymt_amount),
				r.funds,
				Number(r.pymt_cdn)
			])
		).toEqual(expect.arrayContaining([
			['Cash', fx.resnumber, fx.lastname, 'Dana', 50, 'Canadian', 50],
			['Visa', fx.resnumber, fx.lastname, 'Dana', 100, 'Canadian', 100],
			['Visa', fx.resnumber, fx.lastname, 'Dana', 80, 'Canadian', 80]
		]));
	});

	it('totals the day to the deposit line on the Daily Cash Activity Report', async () => {
		expect(await dcarLine(fx.arrival, 'Deposit (Received)', 'Adjustments')).toBe(230);
	});

	it('shows the total beside its agreement with the report, in the viewer', async () => {
		await page.goto(`${APP_URL}/reports/deposits-received?date=${fx.arrival}`, { waitUntil: 'networkidle' });
		await expect.poll(() => page.textContent('.no-print')).toContain('Agrees with Daily Cash');
		expect(await page.textContent('.report-page')).toContain('$230.00');
	});
});
