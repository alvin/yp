// Story: spec/features/show-donation-line-in-upper-section.feature
import { describe, expect, it } from 'vitest';
import { isolatedDate, rpc } from '../helpers/db';

describe('show donation line in upper section', () => {
	it('prints the Donation line in the upper adjustments, even at zero', async () => {
		const upper = await rpc<{ group_name: string; item: string; amount: number }[]>(
			'report_dcar_upper',
			{ p_date: isolatedDate() }
		);
		const donation = upper.find((r) => r.group_name === 'Adjustments' && r.item === 'Donation');
		expect(donation).toBeDefined();
		expect(Number(donation!.amount)).toBe(0);
	});
});
