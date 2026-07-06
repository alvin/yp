// Story: spec/features/use-established-paper-sizes.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, type Fixture } from '../helpers/db';

let fx: Fixture;
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
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('use established paper sizes', () => {
	it('prints guest documents on standard letter portrait', async () => {
		await page.goto(`${APP_URL}/reports/confirmation/${fx.resnumber}`, {
			waitUntil: 'networkidle'
		});
		expect(await pageRule(page)).toContain('size: letter portrait');
	});

	it('prints wide operational reports on letter landscape', async () => {
		await page.goto(`${APP_URL}/reports/housekeeping?date=${addDays(fx.arrival, 1)}`, {
			waitUntil: 'networkidle'
		});
		expect(await pageRule(page)).toContain('size: letter landscape');
	});

	it('prints the daily cash sheet portrait like the original', async () => {
		await page.goto(`${APP_URL}/reports/dcar?date=${fx.arrival}`, { waitUntil: 'networkidle' });
		expect(await pageRule(page)).toContain('size: letter portrait');
	});
});
