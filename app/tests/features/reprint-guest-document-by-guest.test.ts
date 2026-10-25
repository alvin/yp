// Story: spec/features/reprint-guest-document-by-guest.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { cancel, makeReservation, type Fixture } from '../helpers/db';

const DOCUMENTS = ['Confirmation', 'Check-in folio', 'Check-out bill'];
const SLUGS = ['confirmation', 'check-in-folio', 'checkout-bill'];

let fx: Fixture;
let cancelled: Fixture;
let byNumber: string;

const page = useAppPage();
const tabs = () => page.locator('nav[aria-label="Reports in this workflow"] a');

beforeAll(async () => {
	fx = await makeReservation({ firstname: 'Rory' });
	cancelled = await makeReservation({ roomid: null });
	await cancel(cancelled);
});

describe('reprint guest document by guest', () => {
	it('opens a document by its reservation number', async () => {
		await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
		await page.getByRole('tab', { name: /^Check-in folio/ }).click();
		await page.fill('#ind-check_in_folio', String(fx.resnumber));
		await page.locator('[role=tabpanel]:visible').getByRole('button', { name: 'Open' }).click();
		await page.waitForURL(`${APP_URL}/reports/check-in-folio/${fx.resnumber}`, { timeout: 15_000 });
		byNumber = (await page.locator('.report-page').textContent()) ?? '';
	});

	it("finds one guest by name, lists the guest's stays, and opens the document for the stay chosen", async () => {
		await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
		await page.getByRole('tab', { name: /^Check-in folio/ }).click();
		const panel = page.locator('[role=tabpanel]:visible');
		await panel.locator('#guest-doc-q').fill(fx.lastname.slice(0, 12));
		await panel.locator('[data-testid=guest-matches] button', { hasText: fx.lastname }).first().click();
		await panel.locator(`button:has-text("#${fx.resnumber}")`).click();
		await page.waitForURL(`${APP_URL}/reports/check-in-folio/${fx.resnumber}`, { timeout: 15_000 });
	});

	it('is the same document as any other print of the stay', async () => {
		await expect.poll(() => page.locator('.report-page').textContent()).toBe(byNumber);
	});

	it('names the guest and the reservation, and marks which document is showing', async () => {
		const sheet = (await page.locator('.report-page').textContent()) ?? '';
		expect(sheet).toContain(`${fx.lastname}, Rory`);
		expect(sheet).toContain(`Res. No. ${fx.resnumber}`);
		expect(await page.locator('nav[aria-label="Reports in this workflow"] a[aria-current=page]').textContent()).toBe(
			'Check-in folio'
		);
	});

	it("puts the stay's other documents a tab away, a cancellation notice only for a cancelled stay", async () => {
		expect((await tabs().allTextContents()).map((t) => t.trim())).toEqual(DOCUMENTS);
		await page.goto(`${APP_URL}/reports/confirmation/${cancelled.resnumber}`, { waitUntil: 'networkidle' });
		await expect.poll(async () => (await tabs().allTextContents()).map((t) => t.trim())).toEqual([
			...DOCUMENTS,
			'Cancellation'
		]);
	});

	it('opens each document from the reservation screen too', async () => {
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		for (const slug of SLUGS) {
			await page.locator(`a[href="/reports/${slug}/${fx.resnumber}"]`).waitFor({ timeout: 10_000 });
		}
		expect(await page.locator(`a[href="/reports/cancellation/${fx.resnumber}"]`).count()).toBe(0);
		await page.goto(`${APP_URL}/reservations/${cancelled.resnumber}`, { waitUntil: 'networkidle' });
		await page
			.locator(`a[href="/reports/cancellation/${cancelled.resnumber}"]`)
			.waitFor({ timeout: 10_000 });
	});
});
