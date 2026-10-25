// Story: spec/features/classify-deposit-and-prepayment-activity-for-daily-cash-reportin.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { ledger, makeReservation, pay, rpc, type Fixture } from '../helpers/db';

const RECORDED = [
	['Deposit (Received)', 100],
	['Deposit (Refund)', 30],
	['Deposit (Kept)', 20],
	['Prepayment (Received)', 70],
	['Prepayment (Refund)', 10]
] as const;

let fx: Fixture;

const page = useAppPage();

beforeAll(async () => {
	fx = await makeReservation();
	for (const [category, amount] of RECORDED) await pay(fx, category, amount);
});

describe('classify deposit and prepayment activity for daily cash reporting', () => {
	it('offers deposits received, refunded or kept and prepayments received or refunded, never applied', async () => {
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Payment', exact: true }).click();
		await page.click('#p-cat');
		const options = page.locator('[data-testid=combobox-list] [role=option]');
		await options.first().waitFor({ timeout: 10_000 });
		const labels = (await options.allTextContents()).map((t) => t.trim());
		expect(labels).toEqual(expect.arrayContaining(RECORDED.map(([category]) => category)));
		expect(labels.filter((l) => /^(Deposit|Prepayment) /.test(l)).sort()).toEqual(
			RECORDED.map(([category]) => category).sort()
		);
		await page.keyboard.press('Escape');
	});

	it('shows each money movement on the reservation under its own category', async () => {
		const lines = await ledger(fx.reservationid);
		expect(lines.map((l) => l.line_type).sort()).toEqual(RECORDED.map(([c]) => c).sort());
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		const rows = page.locator('table tbody tr');
		await expect.poll(() => rows.count(), { timeout: 10_000 }).toBe(RECORDED.length);
		const shown = await rows.allTextContents();
		for (const [category] of RECORDED) {
			expect(shown.filter((row) => row.includes(category)), category).toHaveLength(1);
		}
	});

	it('keeps deposits apart from prepayments: a prepayment is not deposit held', async () => {
		// Received 100, refunded 30, kept 20; the prepayment does not count.
		expect(
			Number(
				await rpc('reservationguest_deposit_held', { p_reservationguestid: fx.reservationguestid })
			)
		).toBe(50);
	});
});
