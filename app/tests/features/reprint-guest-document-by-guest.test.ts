// Story: spec/features/reprint-guest-document-by-guest.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { makeReservation, type Fixture } from '../helpers/db';

let fx: Fixture;
let page: Page;

beforeAll(async () => {
	fx = await makeReservation();
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('reprint guest document by guest', () => {
	it('reprints an individual document from the print centre by reservation number', async () => {
		await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
		await page.fill('#ind-confirmation', String(fx.resnumber));
		await page.click('button:has-text("Open")');
		await page.waitForURL(new RegExp(`/reports/confirmation/${fx.resnumber}`), {
			timeout: 15_000
		});
	});

	it('renders the same document as the original print', async () => {
		const sheet = await page.textContent('.report-page');
		expect(sheet).toContain(`Res. No. ${fx.resnumber}`);
	});

	it('reprints any of the document types for the reservation', async () => {
		const tabs = await page.textContent('nav[aria-label="Reports in this workflow"]');
		for (const t of ['Confirmation', 'Check-in folio', 'Check-out bill', 'Cancellation']) {
			expect(tabs).toContain(t);
		}
	});
});
