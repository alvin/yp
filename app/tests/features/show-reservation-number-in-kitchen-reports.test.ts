// Story: spec/features/show-reservation-number-in-kitchen-reports.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('save_kitchen_meal', { p_guestid: fx.guestid, p_guestdiet: 'Celiac' });
});

describe('show reservation number in kitchen reports', () => {
	it('shows the reservation number on the full meal report', async () => {
		const rows = await rpc<{ resnumber: number }[]>('report_kitchen_meal', {
			p_date: addDays(fx.arrival, 1)
		});
		expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(true);
	});

	it('shows the reservation number on the filtered kitchen report', async () => {
		const rows = await rpc<{ resnumber: number }[]>('report_kitchen_meal_filtered', {
			p_from: fx.arrival,
			p_to: fx.arrival
		});
		expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(true);
	});
});
