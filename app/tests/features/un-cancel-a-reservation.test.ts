// Story: spec/features/un-cancel-a-reservation.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { cancel, makeReservation, pay, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

interface ReservationRow {
	resnumber: number;
	rescancelled: boolean;
	resdatecancelled: string | null;
	resarrivaldate: string;
	resdeparturedate: string;
}

async function reservation(reservationid: number): Promise<ReservationRow> {
	const db = await staffClient();
	const rows = unwrap(
		await db
			.from('reservations')
			.select('resnumber, rescancelled, resdatecancelled, resarrivaldate, resdeparturedate')
			.eq('reservationid', reservationid)
	) as ReservationRow[];
	return rows[0];
}

describe('un-cancel a reservation', () => {
	let fx: Fixture;

	beforeAll(async () => {
		fx = await makeReservation();
		await pay(fx, 'Deposit (Received)', 35);
		await cancel(fx);
	});

	it('restores the booking as it was, back on the daily reports', async () => {
		const inHouse = async () =>
			(await rpc<{ resnumber: number }[]>('report_in_house', { p_date: fx.arrival })).some(
				(r) => r.resnumber === fx.resnumber
			);
		expect(await inHouse()).toBe(false);

		await rpc('uncancel_reservation', { p_reservationid: fx.reservationid });

		const r = await reservation(fx.reservationid);
		expect(r.rescancelled).toBe(false);
		expect(r.resnumber).toBe(fx.resnumber);
		expect(r.resarrivaldate.slice(0, 10)).toBe(fx.arrival);
		expect(r.resdeparturedate.slice(0, 10)).toBe(fx.departure);
		expect(await inHouse()).toBe(true);
	});

	it('clears the cancellation date: off the cancellation report, and no notice', async () => {
		expect((await reservation(fx.reservationid)).resdatecancelled).toBeNull();
		const list = await rpc<{ resnumber: number }[]>('report_cancellation_list', {
			p_date: fx.arrival
		});
		expect(list.some((r) => r.resnumber === fx.resnumber)).toBe(false);
		expect(
			await rpc<unknown[]>('report_cancellation_notice', { p_reservationid: fx.reservationid })
		).toEqual([]);
	});

	it('gives a deposit decided later back to the stay', async () => {
		expect(
			Number(await rpc('reservationguest_deposit_held', { p_reservationguestid: fx.reservationguestid }))
		).toBe(35);
	});

	it('leaves a deposit refunded on cancelling as it was recorded', async () => {
		const refunded = await makeReservation();
		await pay(refunded, 'Deposit (Received)', 40);
		await cancel(refunded, 'refund');
		await rpc('uncancel_reservation', { p_reservationid: refunded.reservationid });

		const db = await staffClient();
		const refunds = unwrap(
			await db
				.from('payments')
				.select('paymentamount')
				.eq('reservationguestid', refunded.reservationguestid)
				.eq('paymentcategory', 'Deposit (Refund)')
				.eq('paymentarchive', false)
		) as { paymentamount: number }[];
		expect(refunds.map((p) => Number(p.paymentamount))).toEqual([-40]);
		expect(
			await rpc('reservationguest_deposit_held', {
				p_reservationguestid: refunded.reservationguestid
			})
		).toBe(0);
	});

	it('refuses to un-cancel a reservation that is not cancelled', async () => {
		await expect(rpc('uncancel_reservation', { p_reservationid: fx.reservationid })).rejects.toThrow(
			/not cancelled/i
		);
	});
});

describe('un-cancel a reservation — on the reservation screen', () => {
	const page = useAppPage();

	it('has Un-cancel where Cancel was, and brings the booking back', async () => {
		const fx = await makeReservation();
		await cancel(fx);
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		const uncancel = page.getByRole('button', { name: 'Un-cancel' });
		await uncancel.waitFor({ timeout: 10_000 });
		expect(await page.getByRole('button', { name: 'Cancel', exact: true }).count()).toBe(0);

		await uncancel.click();
		await expect
			.poll(async () => (await reservation(fx.reservationid)).rescancelled, { timeout: 15_000 })
			.toBe(false);
		await page.getByRole('button', { name: 'Cancel', exact: true }).waitFor({ timeout: 10_000 });
		expect(await uncancel.count()).toBe(0);
	});
});
