// Story: spec/features/preserve-kitchen-wording.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, makeReservation, rpc, type Fixture } from '../helpers/db';

const DIET = 'No red meat - Pork OK';
const NOTES = 'PREFERS THE CORNER TABLE *extra crispy bacon*';

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('save_kitchen_meal', { p_guestid: fx.guestid, p_guestdiet: DIET, p_notes: NOTES });
});

describe('preserve kitchen wording', () => {
	it('keeps staff wording verbatim on the full meal report', async () => {
		const rows = await rpc<{ resnumber: number; diet_notes: string }[]>('report_kitchen_meal', {
			p_date: addDays(fx.arrival, 1)
		});
		const mine = rows.find((r) => r.resnumber === fx.resnumber)!;
		expect(mine.diet_notes).toContain(DIET);
		expect(mine.diet_notes).toContain(NOTES);
	});

	it('keeps the wording verbatim in the filtered kitchen report fields', async () => {
		const rows = await rpc<{ resnumber: number; guestdiet: string; kitchenmealnotes: string }[]>(
			'report_kitchen_meal_filtered',
			{ p_from: fx.arrival, p_to: fx.arrival }
		);
		const mine = rows.find((r) => r.resnumber === fx.resnumber)!;
		expect(mine.guestdiet).toBe(DIET);
		expect(mine.kitchenmealnotes).toBe(NOTES);
	});
});
