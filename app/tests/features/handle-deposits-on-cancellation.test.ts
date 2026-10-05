// Story: spec/features/handle-deposits-on-cancellation.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, staffClient, unwrap } from '../helpers/db';

async function paymentsFor(rgid: number) {
	const client = await staffClient();
	return unwrap(
		await client
			.from('payments')
			.select('paymentcategory, paymentamount, paymentdate')
			.eq('reservationguestid', rgid)
			.eq('paymentarchive', false)
	) as { paymentcategory: string; paymentamount: number; paymentdate: string }[];
}

describe('handle deposits on cancellation', () => {
	it('refund writes a negative deposit-refund line dated on the cancellation day', async () => {
		const fx = await makeReservation();
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: 'Visa',
			p_amount: 150,
			p_paymentdate: fx.arrival
		});
		await rpc('cancel_reservation', {
			p_reservationid: fx.reservationid,
			p_date: fx.arrival,
			p_deposit_handling: 'refund'
		});
		const pays = await paymentsFor(fx.reservationguestid);
		const refund = pays.find((p) => p.paymentcategory === 'Deposit (Refund)');
		expect(refund?.paymentamount).toBe(-150);
		expect(refund?.paymentdate.slice(0, 10)).toBe(fx.arrival);
		expect(await rpc('reservationguest_deposit_held', { p_reservationguestid: fx.reservationguestid })).toBe(0);
	});

	it('keep writes a deposit-kept line that counts like a charge, bringing the stay to zero', async () => {
		const fx = await makeReservation();
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: 'Visa',
			p_amount: 90,
			p_paymentdate: fx.arrival
		});
		await rpc('cancel_reservation', {
			p_reservationid: fx.reservationid,
			p_date: fx.arrival,
			p_deposit_handling: 'keep'
		});
		const pays = await paymentsFor(fx.reservationguestid);
		expect(pays.find((p) => p.paymentcategory === 'Deposit (Kept)')?.paymentamount).toBe(90);
		expect(await rpc('reservationguest_deposit_held', { p_reservationguestid: fx.reservationguestid })).toBe(0);
		expect(await rpc('reservation_balance', { p_reservationid: fx.reservationid })).toBe(0);
	});

	it('decided later leaves the deposit held and the daily cash report alone', async () => {
		const fx = await makeReservation();
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: 'Visa',
			p_amount: 75,
			p_paymentdate: fx.arrival
		});
		const day = addDays(fx.arrival, 1);
		await rpc('cancel_reservation', {
			p_reservationid: fx.reservationid,
			p_date: day,
			p_deposit_handling: 'none'
		});
		expect(await rpc('reservationguest_deposit_held', { p_reservationguestid: fx.reservationguestid })).toBe(75);
		const upper = await rpc<{ amount: number }[]>('report_dcar_upper', { p_date: day });
		expect(upper.every((r) => Number(r.amount) === 0)).toBe(true);
		expect(await rpc('report_dcar_receipts_total', { p_date: day })).toBe(0);
	});

	it('settles a deposit decided later, refunded or kept, dated the day it is settled', async () => {
		for (const [handling, category] of [
			['refund', 'Deposit (Refund)'],
			['keep', 'Deposit (Kept)']
		] as const) {
			const fx = await makeReservation();
			await rpc('record_payment', {
				p_reservationguestid: fx.reservationguestid,
				p_paymentcategory: 'Deposit (Received)',
				p_paymenttype: 'Visa',
				p_amount: 60,
				p_paymentdate: fx.arrival
			});
			await rpc('cancel_reservation', {
				p_reservationid: fx.reservationid,
				p_date: fx.arrival,
				p_deposit_handling: 'none'
			});
			const settled = addDays(fx.arrival, 2);
			await rpc('settle_deposit', {
				p_reservationid: fx.reservationid,
				p_date: settled,
				p_deposit_handling: handling
			});
			const line = (await paymentsFor(fx.reservationguestid)).find(
				(p) => p.paymentcategory === category
			);
			expect(line?.paymentdate.slice(0, 10)).toBe(settled);
			expect(Math.abs(Number(line?.paymentamount))).toBe(60);
			expect(await rpc('reservationguest_deposit_held', { p_reservationguestid: fx.reservationguestid })).toBe(0);
			expect(await rpc('reservation_balance', { p_reservationid: fx.reservationid })).toBe(0);
		}
	});

	it('refuses to settle when no deposit is held', async () => {
		const fx = await makeReservation();
		await expect(
			rpc('settle_deposit', {
				p_reservationid: fx.reservationid,
				p_date: fx.arrival,
				p_deposit_handling: 'refund'
			})
		).rejects.toThrow(/holds no deposit/i);
	});

	it('keeps daily cash balanced after deposit handling', async () => {
		const fx = await makeReservation();
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: 'Visa',
			p_amount: 120,
			p_paymentdate: fx.arrival
		});
		await rpc('cancel_reservation', {
			p_reservationid: fx.reservationid,
			p_date: fx.arrival,
			p_deposit_handling: 'refund'
		});
		// The fixture's isolated date contains only this activity: received +120,
		// refunded −120 → both DCAR sections net to zero and agree.
		const upper = await rpc<number>('report_dcar_total', { p_date: fx.arrival });
		const lower = await rpc<number>('report_dcar_receipts_total', { p_date: fx.arrival });
		expect(upper).toBe(lower);
	});

	it('keeps daily cash balanced when a deposit is kept, with no card or cash line moving', async () => {
		const fx = await makeReservation();
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: 'Visa',
			p_amount: 45,
			p_paymentdate: fx.arrival
		});
		const day = addDays(fx.arrival, 1);
		await rpc('cancel_reservation', {
			p_reservationid: fx.reservationid,
			p_date: day,
			p_deposit_handling: 'keep'
		});
		expect(await rpc('report_dcar_total', { p_date: day })).toBe(0);
		const tenders = await rpc<{ calc_amount: number }[]>('report_dcar_payments', { p_date: day });
		expect(tenders.every((t) => Number(t.calc_amount) === 0)).toBe(true);
	});

	it('records the cancellation flags for staff to review', async () => {
		const fx = await makeReservation();
		await rpc('cancel_reservation', {
			p_reservationid: fx.reservationid,
			p_date: fx.arrival,
			p_deposit_handling: 'none',
			p_notes: 'QA cancellation'
		});
		const client = await staffClient();
		const rows = unwrap(
			await client
				.from('reservations')
				.select('rescancelled, resdatecancelled, resnotes')
				.eq('reservationid', fx.reservationid)
		) as { rescancelled: boolean; resdatecancelled: string; resnotes: string }[];
		expect(rows[0].rescancelled).toBe(true);
		expect(rows[0].resdatecancelled.slice(0, 10)).toBe(fx.arrival);
		expect(rows[0].resnotes).toContain('QA cancellation');
	});
});

describe('handle deposits on cancellation — the cancel dialog', () => {
	let page: Page;

	beforeAll(async () => {
		page = await openAppPage();
	});

	afterAll(async () => {
		await closeApp(page);
	});

	it('shows the deposit still held, not the deposit first received', async () => {
		const fx = await makeReservation();
		for (const [category, amount] of [
			['Deposit (Received)', 100],
			['Deposit (Received)', 50],
			['Deposit (Applied)', 40]
		] as const) {
			await rpc('record_payment', {
				p_reservationguestid: fx.reservationguestid,
				p_paymentcategory: category,
				p_paymenttype: 'Visa',
				p_amount: amount,
				p_paymentdate: fx.arrival
			});
		}
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Cancel', exact: true }).click();
		const dialog = page.getByRole('dialog');
		await expect.poll(() => dialog.textContent(), { timeout: 10_000 }).toContain('$110.00');
	});

	it('offers to decide later when a deposit is on file', async () => {
		const fx = await makeReservation();
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: 'Visa',
			p_amount: 40,
			p_paymentdate: fx.arrival
		});
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Cancel', exact: true }).click();
		await page.click('#cx-outcome');
		const options = page.locator('[data-testid=combobox-list] [role=option]');
		await expect
			.poll(async () => (await options.allTextContents()).map((t) => t.trim()), { timeout: 10_000 })
			.toEqual(['Refund the deposit', 'Keep the deposit', 'Decide later']);
		await page.keyboard.press('Escape');
	});

	it('settles a deposit decided later from the cancelled reservation', async () => {
		const fx = await makeReservation();
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: 'Visa',
			p_amount: 55,
			p_paymentdate: fx.arrival
		});
		await rpc('cancel_reservation', {
			p_reservationid: fx.reservationid,
			p_date: fx.arrival,
			p_deposit_handling: 'none'
		});
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Settle deposit' }).click();
		const dialog = page.getByRole('dialog');
		await expect.poll(() => dialog.textContent(), { timeout: 10_000 }).toContain('$55.00');
		await dialog.getByRole('button', { name: 'Settle deposit' }).click();
		await expect
			.poll(
				async () =>
					(await paymentsFor(fx.reservationguestid)).some(
						(p) => p.paymentcategory === 'Deposit (Refund)' && Number(p.paymentamount) === -55
					),
				{ timeout: 15_000 }
			)
			.toBe(true);
		await expect
			.poll(() => page.getByRole('button', { name: 'Settle deposit' }).count(), { timeout: 15_000 })
			.toBe(0);
	});
});
