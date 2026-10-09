// Story: spec/features/show-quantity-per-item-in-items-cashed-out-appendix.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { firstRoomId, makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

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
	await rpc('post_room_nights', {
		p_reservationguestid: fx.reservationguestid,
		p_roomid: await firstRoomId(),
		p_occupancyin: fx.arrival,
		p_occupancyout: fx.departure,
		p_rate: 100,
		p_transdate: fx.arrival
	});
});

describe('show quantity per item in items cashed out appendix', () => {
	it('carries the quantity on each cashed-out line', async () => {
		const rows = await rpc<{ resnumber: number; quantity: number; total: number }[]>(
			'report_items_cashed_out',
			{ p_date: fx.departure }
		);
		const mine = rows.find((r) => r.resnumber === fx.resnumber);
		expect(mine?.quantity).toBe(3);
		expect(Number(mine?.total)).toBe(30);
	});

	it('identifies the line by inventory code, reservation, and guest', async () => {
		const rows = await rpc<
			{ resnumber: number; inv_code: string; guestlastname: string; item: string }[]
		>('report_items_cashed_out', { p_date: fx.departure });
		const mine = rows.find((r) => r.resnumber === fx.resnumber)!;
		expect(mine.inv_code).toBeTruthy();
		expect(mine.guestlastname).toBe(fx.lastname);
		expect(mine.item).toBeTruthy();
	});

	it('lists the items sold and not the room nights', async () => {
		const rows = await rpc<{ resnumber: number; total: number }[]>('report_items_cashed_out', {
			p_date: fx.departure
		});
		const mine = rows.filter((r) => r.resnumber === fx.resnumber);
		expect(mine.map((r) => Number(r.total))).toEqual([30]);
	});

	it('agrees with the daily cash report’s sales lines other than Room', async () => {
		const [rows, upper] = await Promise.all([
			rpc<{ total: number }[]>('report_items_cashed_out', { p_date: fx.departure }),
			rpc<{ item: string; amount: number }[]>('report_dcar_upper', { p_date: fx.departure })
		]);
		const line = (item: string) => Number(upper.find((u) => u.item === item)?.amount ?? 0);
		expect(line('Room')).toBe(300);
		const items = rows.reduce((sum, r) => sum + Number(r.total), 0);
		expect(items).toBeCloseTo(line('Total Sales and Charges') - line('Room') - line('Cancellation'), 2);
	});

	it('lists the item on its stay’s check-out day, not the day it was posted', async () => {
		const posted = await rpc<{ resnumber: number }[]>('report_items_cashed_out', {
			p_date: fx.arrival
		});
		expect(posted.some((r) => r.resnumber === fx.resnumber)).toBe(false);
	});
});
