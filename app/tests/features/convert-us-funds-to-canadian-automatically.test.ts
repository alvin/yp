// Story: spec/features/convert-us-funds-to-canadian-automatically.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import {
	isolatedDate,
	makeReservation,
	pay,
	rpc,
	staffClient,
	todayISO,
	unwrap,
	type Fixture
} from '../helpers/db';

interface Payment {
	paymentcode: string;
	paymentamountcdn: number;
}

const today = todayISO();

async function payment(id: number): Promise<Payment> {
	const db = await staffClient();
	const [row] = unwrap(
		await db.from('payments').select('paymentcode, paymentamountcdn').eq('paymentid', id)
	) as Payment[];
	return { ...row, paymentamountcdn: Number(row.paymentamountcdn) };
}

async function update(id: number, values: Record<string, unknown>): Promise<void> {
	const db = await staffClient();
	unwrap(await db.from('payments').update(values).eq('paymentid', id).select('paymentid'));
}

const exchange = async (date: string) => Number(await rpc('effective_exchange_rate', { p_date: date }));
const cdn = (amount: number, rate: number) => Math.round(amount * rate * 100) / 100;

describe('convert US funds to Canadian automatically', () => {
	let fx: Fixture;
	let rate: number;

	beforeAll(async () => {
		fx = await makeReservation();
		rate = await exchange(today);
		// Today's rate is on file; a rate of 1 would let a missing conversion pass.
		expect(rate).toBeGreaterThan(0);
		expect(rate).not.toBe(1);
	});

	it('fills the Canadian amount from the exchange rate on the payment date', async () => {
		const id = await pay(fx, 'Payment (Regular)', 100, { type: 'U.S. Cash', currency: 'US', date: today });
		expect((await payment(id)).paymentamountcdn).toBe(cdn(100, rate));
	});

	it('carries a Canadian payment’s own amount as its Canadian value', async () => {
		const id = await pay(fx, 'Payment (Regular)', 88.5, { type: 'Cash', date: today });
		expect((await payment(id)).paymentamountcdn).toBe(88.5);
	});

	it('recalculates the Canadian value when the amount, currency or date changes', async () => {
		const id = await pay(fx, 'Payment (Regular)', 10, { type: 'Cash', date: today });
		await update(id, { paymentamount: 40 });
		expect((await payment(id)).paymentamountcdn).toBe(40);

		await update(id, { paymentcurrency: 'US' });
		expect((await payment(id)).paymentamountcdn).toBe(cdn(40, rate));

		const earlier = isolatedDate();
		await update(id, { paymentdate: earlier });
		expect((await payment(id)).paymentamountcdn).toBe(cdn(40, await exchange(earlier)));
		expect((await payment(id)).paymentamountcdn).not.toBe(cdn(40, rate));
	});

	it('derives the payment code from the category', async () => {
		const id = await pay(fx, 'Deposit (Received)', 55, { date: today });
		expect((await payment(id)).paymentcode).toBe('D01');
	});

	describe('at the desk', () => {
		const page = useAppPage();

		beforeAll(async () => {
			await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
			await page.getByRole('button', { name: 'Payment', exact: true }).click();
			await page.locator('#p-amt').waitFor({ timeout: 10_000 });
		});

		it('offers no choice of funds when a receipt is taken', async () => {
			const dialog = await page.textContent('[role=dialog]');
			expect(dialog).not.toContain('Funds');
			expect(dialog).not.toContain('CDN value');
			expect(await page.locator('#p-cur').count()).toBe(0);
		});

		it('offers no US tender type', async () => {
			await page.click('#p-type');
			const tenders = page.locator('[data-testid=combobox-list] [role=option]');
			await expect.poll(() => tenders.count(), { timeout: 10_000 }).toBeGreaterThan(5);
			expect((await tenders.allTextContents()).filter((t) => t.includes('U.S.'))).toEqual([]);
		});
	});
});
