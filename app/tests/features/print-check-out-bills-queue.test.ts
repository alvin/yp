// Story: spec/features/print-check-out-bills-queue.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { addDays, cancel, makeReservation, postRoomNights, rpc, type Fixture } from '../helpers/db';

const bills = async (date: string) =>
	(
		await rpc<{ resnumber: number }[]>('report_guest_document_queue', {
			p_document: 'checkout_bill',
			p_date: date
		})
	).map((r) => r.resnumber);

let fx: Fixture;
let cancelled: Fixture;

const page = useAppPage();

beforeAll(async () => {
	fx = await makeReservation();
	await postRoomNights(fx, 120);
	cancelled = await makeReservation({ departure: fx.departure, arrival: fx.arrival, roomid: null });
	await cancel(cancelled);
});

describe('print check-out bills queue', () => {
	it("queues the day's departures, and no cancelled stay", async () => {
		expect(await bills(fx.departure)).toEqual([fx.resnumber]);
	});

	it('queues no bill on any other day of the stay', async () => {
		expect(await bills(fx.arrival)).toEqual([]);
		expect(await bills(addDays(fx.departure, -1))).toEqual([]);
	});

	it("prints the day's bills together in the batch's bill group, each with its number and balance owing", async () => {
		const [header] = await rpc<{ resnumber: number; balance_owing: number }[]>(
			'report_checkout_bill_header',
			{ p_reservationid: fx.reservationid }
		);
		// Three nights at $120 on historical dates, where every tax rate is zero.
		expect(Number(header.balance_owing)).toBe(360);

		await page.goto(`${APP_URL}/print/batch?date=${fx.departure}`, { waitUntil: 'networkidle' });
		const group = page.locator('[data-testid=group-checkout_bill]');
		await group.waitFor({ timeout: 15_000 });
		expect(await group.locator('.report-page').count()).toBe(1);
		const bill = (await group.locator('.report-page').textContent()) ?? '';
		expect(bill).toContain(String(fx.resnumber));
		expect(bill).toContain('$360.00');
	});
});
