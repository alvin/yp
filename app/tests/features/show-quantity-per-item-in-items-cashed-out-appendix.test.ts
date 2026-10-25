// Story: spec/features/show-quantity-per-item-in-items-cashed-out-appendix.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { dcarLine, makeReservation, postCharge, postRoomNights, pricedItem, rpc, type Fixture, type Item } from '../helpers/db';

interface CashedOut {
	resnumber: number;
	inv_code: string;
	item: string;
	guestlastname: string;
	quantity: number;
	total: number;
}

let fx: Fixture;
let item: Item;

const cashedOut = (date: string) => rpc<CashedOut[]>('report_items_cashed_out', { p_date: date });

beforeAll(async () => {
	fx = await makeReservation();
	item = await pricedItem();
	await postCharge(fx, { inventoryid: item.inventoryid, quantity: 3, amount: 30 });
	await postRoomNights(fx, 100);
});

describe('show quantity per item in items cashed out appendix', () => {
	it('lists the item sold with its quantity, code, reservation and guest — and not the room nights', async () => {
		const rows = await cashedOut(fx.departure);
		expect(
			rows.map((r) => [r.resnumber, r.inv_code, r.item, r.guestlastname, r.quantity, Number(r.total)])
		).toEqual([[fx.resnumber, item.invcode, item.invitemdescription, fx.lastname, 3, 30]]);
	});

	it('agrees with the daily cash report’s sales lines other than Room', async () => {
		expect(await dcarLine(fx.departure, 'Room', 'Revenue')).toBe(300);
		expect(await dcarLine(fx.departure, 'Total Sales and Charges')).toBe(330);
		const items = (await cashedOut(fx.departure)).reduce((sum, r) => sum + Number(r.total), 0);
		expect(items).toBe(330 - 300);
	});

	it('lists the item on its stay’s check-out day, not the day it was posted', async () => {
		expect(await cashedOut(fx.arrival)).toEqual([]);
	});
});
