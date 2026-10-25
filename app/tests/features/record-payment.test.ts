// Story: spec/features/record-payment.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { ledger, makeReservation, pay, postRoomNights, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;

const page = useAppPage();
const balance = async () => Number(await rpc('reservation_balance', { p_reservationid: fx.reservationid }));

beforeAll(async () => {
	fx = await makeReservation();
	await postRoomNights(fx, 100); // $300 owing; historical dates carry no tax
});

describe('record payment', () => {
	it('adds a payment to the reservation and takes it off the balance', async () => {
		const id = await pay(fx, 'Payment (Regular)', 120);
		const line = (await ledger(fx.reservationid)).find(
			(l) => l.line_source === 'payment' && l.line_id === id
		);
		expect([line?.line_type, line?.line_date.slice(0, 10), Number(line?.amount)]).toEqual([
			'Payment (Regular)',
			fx.arrival,
			120
		]);
		expect(await balance()).toBe(180);
	});

	it('records a payment taken on the reservation screen, for review in its transactions', async () => {
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		const rows = page.locator('table tbody tr');
		await expect.poll(() => rows.count(), { timeout: 15_000 }).toBe(2);
		await page.getByRole('button', { name: 'Payment', exact: true }).click();
		await page.fill('#p-amt', '50');
		await page.fill('#p-date', fx.arrival);
		await page.getByRole('button', { name: 'Record', exact: true }).click();

		await expect.poll(() => rows.count(), { timeout: 15_000 }).toBe(3);
		expect(await rows.filter({ hasText: '$50.00' }).count()).toBe(1);
		await expect.poll(balance, { timeout: 10_000 }).toBe(130);
		await expect
			.poll(() => page.locator('text=Balance owing').locator('xpath=..').textContent())
			.toContain('$130.00');
	});
});
