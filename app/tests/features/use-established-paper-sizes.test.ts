// Story: spec/features/use-established-paper-sizes.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;
let cancelled: Fixture;
let page: Page;

async function pageRule(p: Page): Promise<string> {
	return p.evaluate(() =>
		Array.from(document.querySelectorAll('style'))
			.map((s) => s.textContent ?? '')
			.filter((t) => t.includes('@page'))
			.join('\n')
	);
}

beforeAll(async () => {
	fx = await makeReservation();
	// A cancellation notice is printed for a cancelled stay.
	cancelled = await makeReservation();
	await rpc('cancel_reservation', {
		p_reservationid: cancelled.reservationid,
		p_date: cancelled.arrival,
		p_deposit_handling: 'none'
	});
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('use established paper sizes', () => {
	it('prints guest slips and folios on the smaller folio page', async () => {
		for (const doc of ['confirmation', 'check-in-folio', 'checkout-bill', 'cancellation']) {
			const resnumber = doc === 'cancellation' ? cancelled.resnumber : fx.resnumber;
			await page.goto(`${APP_URL}/reports/${doc}/${resnumber}`, {
				waitUntil: 'networkidle'
			});
			expect(await pageRule(page), doc).toContain('size: A5 portrait');
		}
	});

	it('prints wide operational reports on letter landscape', async () => {
		await page.goto(`${APP_URL}/reports/housekeeping?date=${addDays(fx.arrival, 1)}`, {
			waitUntil: 'networkidle'
		});
		expect(await pageRule(page)).toContain('size: letter landscape');
		await page.goto(`${APP_URL}/reports/in-house?date=${addDays(fx.arrival, 1)}`, {
			waitUntil: 'networkidle'
		});
		expect(await pageRule(page)).toContain('size: letter landscape');
	});

	it('prints the daily cash sheet portrait like the original', async () => {
		await page.goto(`${APP_URL}/reports/dcar?date=${fx.arrival}`, { waitUntil: 'networkidle' });
		expect(await pageRule(page)).toContain('size: letter portrait');
	});
});
