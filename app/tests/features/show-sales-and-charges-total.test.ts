// Story: spec/features/show-sales-and-charges-total.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

interface UpperRow {
	group_name: string;
	item: string;
	amount: number;
}

let fx: Fixture;
let upper: UpperRow[];

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
	await rpc('post_room_nights', {
		p_reservationguestid: fx.reservationguestid,
		p_roomid: (await rpc<{ roomid: number }[]>('room_directory'))[0].roomid,
		p_occupancyin: fx.arrival,
		p_occupancyout: fx.departure,
		p_rate: 100,
		p_transdate: fx.arrival
	});
	await rpc('post_charge', {
		p_reservationguestid: fx.reservationguestid,
		p_inventoryid: inv[0].inventoryid,
		p_quantity: 1,
		p_transdate: fx.arrival,
		p_amount: 45
	});
	upper = await rpc<UpperRow[]>('report_dcar_upper', { p_date: fx.arrival });
});

describe('show sales and charges total', () => {
	it('shows a revenue line per charge type', () => {
		const room = upper.find((r) => r.group_name === 'Revenue' && r.item === 'Room');
		expect(Number(room?.amount)).toBe(300);
	});

	it('totals the day’s sales and charges', () => {
		const total = upper.find((r) => r.item === 'Total Sales and Charges');
		expect(Number(total?.amount)).toBe(345);
	});

	it('equals the sum of the revenue rows', () => {
		const revenue = upper
			.filter((r) => r.group_name === 'Revenue' && r.item !== 'Total Sales and Charges')
			.reduce((s, r) => s + Number(r.amount), 0);
		const total = upper.find((r) => r.item === 'Total Sales and Charges')!;
		expect(Number(total.amount)).toBeCloseTo(revenue, 2);
	});
});
