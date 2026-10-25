// Story: spec/features/show-donation-line-in-daily-cash-upper-section.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { dcarLine, isolatedDate, makeReservation, pay, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	await pay(fx, 'Donation', 25, { type: 'Cash' });
});

describe('show donation line in daily cash upper section', () => {
	it('lands a donation on the Donation line among the adjustments', async () => {
		expect(await dcarLine(fx.arrival, 'Donation', 'Adjustments')).toBe(25);
	});

	it('counts the donation toward the upper total and the day’s receipts', async () => {
		expect(Number(await rpc('report_dcar_total', { p_date: fx.arrival }))).toBe(25);
		expect(Number(await rpc('report_dcar_receipts_total', { p_date: fx.arrival }))).toBe(25);
	});

	it('prints the Donation line on a day with no donations, at zero', async () => {
		expect(await dcarLine(isolatedDate(), 'Donation', 'Adjustments')).toBe(0);
	});
});
