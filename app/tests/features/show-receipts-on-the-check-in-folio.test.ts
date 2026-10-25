// Story: spec/features/show-receipts-on-the-check-in-folio.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { makeReservation, pay, type Fixture } from '../helpers/db';

let full: Fixture; // deposit + prepayment + gift certificate
let plain: Fixture; // a deposit and nothing else

const page = useAppPage();

/** The receipts table on the printed folio, as [category, tender, amount] rows. */
async function receipts(fx: Fixture): Promise<string[][]> {
	await page.goto(`${APP_URL}/reports/check-in-folio/${fx.resnumber}`, { waitUntil: 'networkidle' });
	const table = page.locator('.report-page table').nth(1);
	return table.locator('tbody tr').evaluateAll((rows) =>
		rows.map((r) => {
			const [what, amount] = Array.from(r.children).map((c) => (c as HTMLElement).innerText.trim());
			return [...what.split('\n').map((s) => s.trim()), amount];
		})
	);
}

beforeAll(async () => {
	full = await makeReservation();
	await pay(full, 'Deposit (Received)', 100);
	await pay(full, 'Prepayment (Received)', 250, { type: 'Cheque' });
	await pay(full, 'Gift Certificate Received', 50, { type: 'Gift Certificate' });

	plain = await makeReservation();
	await pay(plain, 'Deposit (Received)', 75);
});

describe('show receipts on the check-in folio', () => {
	it('prints every receipt held, each named as what it is with its tender and amount', async () => {
		expect((await receipts(full)).sort()).toEqual(
			[
				['Deposit (Received)', 'Visa', '$100.00'],
				['Gift Certificate Received', 'Gift Certificate', '$50.00'],
				['Prepayment (Received)', 'Cheque', '$250.00']
			].sort()
		);
	});

	it('prints a stay with only a deposit as that deposit alone', async () => {
		expect(await receipts(plain)).toEqual([['Deposit (Received)', 'Visa', '$75.00']]);
	});
});
