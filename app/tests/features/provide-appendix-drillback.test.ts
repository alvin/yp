// Story: spec/features/provide-appendix-drillback.feature
import { describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { isolatedDate } from '../helpers/db';

const date = isolatedDate();
const page = useAppPage(`/reports/dcar?date=${date}`);
const tabs = () => page.locator('nav[aria-label="Reports in this workflow"] a');

describe('provide appendix drillback', () => {
	it('sets the report and its appendices side by side as tabs', async () => {
		expect((await tabs().allTextContents()).map((t) => t.trim())).toEqual([
			'Daily Cash Report',
			'Deposits received',
			'Deposits applied',
			'Cashier detail',
			'Items cashed out'
		]);
	});

	it('keeps the business date moving to each appendix and back', async () => {
		for (const [label, slug] of [
			['Deposits received', 'deposits-received'],
			['Deposits applied', 'deposits-applied'],
			['Cashier detail', 'cashier-detail'],
			['Items cashed out', 'items-cashed-out']
		]) {
			await tabs().filter({ hasText: label }).click();
			await page.waitForURL(`${APP_URL}/reports/${slug}?date=${date}`, { timeout: 15_000 });
			await tabs().filter({ hasText: 'Daily Cash Report' }).click();
			await page.waitForURL(`${APP_URL}/reports/dcar?date=${date}`, { timeout: 15_000 });
		}
	});
});
