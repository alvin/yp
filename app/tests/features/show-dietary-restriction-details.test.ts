// Story: spec/features/show-dietary-restriction-details.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;
let mid: string;

beforeAll(async () => {
	fx = await makeReservation();
	mid = addDays(fx.arrival, 1);
	await rpc('save_kitchen_meal', {
		p_guestid: fx.guestid,
		p_guestdiet: 'Deathly allergic to nuts',
		p_notes: 'Confirm every dish with the kitchen.'
	});
});

describe('show dietary restriction details', () => {
	it('shows allergy detail exactly as recorded', async () => {
		const rows = await rpc<{ resnumber: number; diet_notes: string }[]>('report_kitchen_meal', {
			p_date: mid
		});
		const mine = rows.find((r) => r.resnumber === fx.resnumber)!;
		expect(mine.diet_notes).toContain('Deathly allergic to nuts');
		expect(mine.diet_notes).toContain('Confirm every dish with the kitchen.');
	});

	it('keeps the restriction tied to the specific guest in the filtered report', async () => {
		const rows = await rpc<{ resnumber: number; guestdiet: string; guestlastname: string }[]>(
			'report_kitchen_meal_filtered',
			{ p_from: fx.arrival, p_to: fx.arrival }
		);
		const mine = rows.find((r) => r.resnumber === fx.resnumber)!;
		expect(mine.guestdiet).toBe('Deathly allergic to nuts');
		expect(mine.guestlastname).toBe(fx.lastname);
	});
});
