// Story: spec/features/show-kitchen-report.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;
let mid: string;
let rows: { resnumber: number; guest: string; arrival_date: string; departure_date: string; diet_notes: string }[];

beforeAll(async () => {
	fx = await makeReservation();
	mid = addDays(fx.arrival, 1);
	await rpc('save_kitchen_meal', {
		p_guestid: fx.guestid,
		p_guestdiet: 'Vegetarian',
		p_notes: 'No mushrooms.'
	});
	rows = await rpc('report_kitchen_meal', { p_date: mid });
});

describe('show kitchen report', () => {
	it('lists in-house guests with dietary needs for the day', () => {
		const mine = rows.find((r) => r.resnumber === fx.resnumber);
		expect(mine).toBeDefined();
		expect(mine!.guest).toContain(fx.lastname);
	});

	it('carries the diet and meal notes together', () => {
		const mine = rows.find((r) => r.resnumber === fx.resnumber)!;
		expect(mine.diet_notes).toContain('Vegetarian');
		expect(mine.diet_notes).toContain('No mushrooms.');
	});

	it('shows the stay dates for kitchen planning', () => {
		const mine = rows.find((r) => r.resnumber === fx.resnumber)!;
		expect(mine.arrival_date).toBe(fx.arrival);
		expect(mine.departure_date).toBe(fx.departure);
	});
});
