// Story: spec/features/show-quantity-per-item-in-items-cashed-out-appendix.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	const client = await staffClient();
	const inv = unwrap(
		await client
			.from('inventory_items')
			.select('inventoryid')
			.eq('invarchive', false)
			.gt('invamount', 0)
			.limit(1)
	) as { inventoryid: number }[];
	await rpc('post_charge', {
		p_reservationguestid: fx.reservationguestid,
		p_inventoryid: inv[0].inventoryid,
		p_quantity: 3,
		p_transdate: fx.arrival,
		p_amount: 30
	});
});

describe('show quantity per item in items cashed out appendix', () => {
	it('carries the quantity on each cashed-out line', async () => {
		const rows = await rpc<{ resnumber: number; quantity: number; total: number }[]>(
			'report_items_cashed_out',
			{ p_date: fx.arrival }
		);
		const mine = rows.find((r) => r.resnumber === fx.resnumber);
		expect(mine?.quantity).toBe(3);
		expect(Number(mine?.total)).toBe(30);
	});

	it('identifies the line by inventory code, reservation, and guest', async () => {
		const rows = await rpc<
			{ resnumber: number; inv_code: string; guestlastname: string; item: string }[]
		>('report_items_cashed_out', { p_date: fx.arrival });
		const mine = rows.find((r) => r.resnumber === fx.resnumber)!;
		expect(mine.inv_code).toBeTruthy();
		expect(mine.guestlastname).toBe(fx.lastname);
		expect(mine.item).toBeTruthy();
	});
});
