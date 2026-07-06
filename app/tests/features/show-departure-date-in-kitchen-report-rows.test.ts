// Story: spec/features/show-departure-date-in-kitchen-report-rows.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('save_kitchen_meal', { p_guestid: fx.guestid, p_guestdiet: 'No Seafood' });
});

describe('show departure date in kitchen report rows', () => {
	it('carries the departure date on full-report rows', async () => {
		const rows = await rpc<{ resnumber: number; departure_date: string }[]>('report_kitchen_meal', {
			p_date: addDays(fx.arrival, 1)
		});
		expect(rows.find((r) => r.resnumber === fx.resnumber)?.departure_date).toBe(fx.departure);
	});

	it('carries the departure date on filtered-report rows', async () => {
		const rows = await rpc<{ resnumber: number; departure_date: string }[]>(
			'report_kitchen_meal_filtered',
			{ p_from: fx.arrival, p_to: fx.arrival }
		);
		expect(rows.find((r) => r.resnumber === fx.resnumber)?.departure_date).toBe(fx.departure);
	});
});
