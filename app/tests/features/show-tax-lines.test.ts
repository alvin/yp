// Story: spec/features/show-tax-lines.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { isolatedDate, rpc } from '../helpers/db';

let upper: { group_name: string; item: string }[];

beforeAll(async () => {
	upper = await rpc('report_dcar_upper', { p_date: isolatedDate() });
});

describe('show tax lines', () => {
	it('prints every named tax line, even at zero', () => {
		for (const t of ['GST', 'PST', 'HST', 'Liquor Tax', 'Room Tax', 'Hotel Tax', 'Dest Mktg Tax']) {
			expect(upper.some((r) => r.group_name === 'Taxes' && r.item === t)).toBe(true);
		}
	});

	it('carries a Total Taxes line', () => {
		expect(upper.some((r) => r.item === 'Total Taxes')).toBe(true);
	});
});
