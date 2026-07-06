// Story: spec/features/show-kitchen-notes-in-filtered-kitchen-mode.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('save_kitchen_meal', {
		p_guestid: fx.guestid,
		p_guestdiet: 'Tailored Diet',
		p_notes: 'Kitchen to call the guest on arrival.'
	});
});

describe('show kitchen notes in filtered kitchen mode', () => {
	it('keeps guest diet and kitchen notes as separate columns', async () => {
		const rows = await rpc<
			{ resnumber: number; guestdiet: string; kitchenmealnotes: string | null }[]
		>('report_kitchen_meal_filtered', { p_from: fx.arrival, p_to: fx.arrival });
		const mine = rows.find((r) => r.resnumber === fx.resnumber)!;
		expect(mine.guestdiet).toBe('Tailored Diet');
		expect(mine.kitchenmealnotes).toBe('Kitchen to call the guest on arrival.');
	});

	it('identifies the guest by last and first name', async () => {
		const rows = await rpc<{ resnumber: number; guestlastname: string; guestfirstname: string }[]>(
			'report_kitchen_meal_filtered',
			{ p_from: fx.arrival, p_to: fx.arrival }
		);
		const mine = rows.find((r) => r.resnumber === fx.resnumber)!;
		expect(mine.guestlastname).toBe(fx.lastname);
		expect(mine.guestfirstname).toBeTruthy();
	});
});
