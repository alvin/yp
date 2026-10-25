// Story: spec/features/show-receipts-converted-to-canadian-dollars.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { makeReservation, pay, rpc, todayISO, type Fixture } from '../helpers/db';

let fx: Fixture;
let rate: number;
const today = todayISO();

const page = useAppPage();

beforeAll(async () => {
	fx = await makeReservation();
	rate = Number(await rpc('effective_exchange_rate', { p_date: today }));
	// Today's rate is on file; at 1 a missing conversion would pass unseen.
	expect(rate).not.toBe(1);
	// Taken today, so the dated exchange table applies.
	await pay(fx, 'Deposit (Received)', 100, { type: 'U.S. Cash', currency: 'US', date: today });
	await pay(fx, 'Deposit (Received)', 50, { type: 'Visa', date: today });
});

const money = (n: number) => `$${n.toFixed(2)}`;

describe('show receipts converted to Canadian dollars', () => {
	it('shows a U.S. receipt at its U.S. amount, marked U.S., beside its Canadian value', async () => {
		await page.goto(`${APP_URL}/reports/deposits-received?date=${today}`, { waitUntil: 'networkidle' });
		const mine = page.locator('.report-page tbody tr', { hasText: String(fx.resnumber) });
		await expect.poll(() => mine.count(), { timeout: 10_000 }).toBe(2);
		const rows = await mine.evaluateAll((trs) =>
			trs.map((tr) => Array.from(tr.children).map((c) => (c as HTMLElement).innerText.trim()))
		);
		const pick = (type: string) => {
			const row = rows.find((r) => r[0] === type)!;
			return [row[4], row[5], row[6]];
		};
		expect(pick('U.S. Cash')).toEqual([money(100), expect.stringMatching(/^US/), money(Math.round(100 * rate * 100) / 100)]);
		expect(pick('Visa')).toEqual([money(50), 'Canadian', money(50)]);
	});

	it('counts receipts at their Canadian value on the cashier detail, and says so on the cash sheet', async () => {
		const rows = await rpc<{ resnumber: number; amount: number }[]>('report_cashier_detail', {
			p_date: today
		});
		expect(rows.filter((r) => r.resnumber === fx.resnumber).map((r) => Number(r.amount)).sort()).toEqual(
			[50, Math.round(100 * rate * 100) / 100].sort()
		);
		await page.goto(`${APP_URL}/reports/dcar?date=${today}`, { waitUntil: 'networkidle' });
		await expect.poll(() => page.textContent('.report-page')).toContain('All US amounts converted to Cdn');
	});
});
