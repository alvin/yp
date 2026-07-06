// Story: spec/features/transfer-deposits-on-rebooking.feature

import { describe, expect, it } from 'vitest';
import { addDays, isolatedDate, makeReservation, rpc, staffClient, unwrap } from '../helpers/db';

describe('transfer deposits on rebooking', () => {
	it('moves the deposit to the new stay through an offsetting pair and cancels the original', async () => {
		const fx = await makeReservation();
		await rpc('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: 'Visa',
			p_amount: 200,
			p_paymentdate: fx.arrival
		});

		const newArrival = isolatedDate();
		const created = await rpc<{ reservationid: number; resnumber: number }[]>(
			'rebook_reservation',
			{
				p_reservationid: fx.reservationid,
				p_arrival: newArrival,
				p_departure: addDays(newArrival, 3),
				p_bookedby: 'QA'
			}
		);
		const next = created[0];
		expect(next.resnumber).not.toBe(fx.resnumber);

		// Same guests on the new stay.
		const client = await staffClient();
		const newRgs = unwrap(
			await client
				.from('reservation_guests')
				.select('reservationguestid, guestid')
				.eq('reservationid', next.reservationid)
				.eq('rgarchive', false)
		) as { reservationguestid: number; guestid: number }[];
		expect(newRgs.map((g) => g.guestid)).toContain(fx.guestid);

		// Deposit moved: nothing held on the old guest row, 200 held on the new stay.
		expect(
			await rpc('reservationguest_deposit_held', { p_reservationguestid: fx.reservationguestid })
		).toBe(0);
		const held = await Promise.all(
			newRgs.map((g) =>
				rpc<number>('reservationguest_deposit_held', { p_reservationguestid: g.reservationguestid })
			)
		);
		expect(held.reduce((s, h) => s + Number(h), 0)).toBe(200);

		// Transfer pair nets to zero in daily cash on the transfer day.
		const today = new Date().toLocaleDateString('en-CA');
		const pays = unwrap(
			await client
				.from('payments')
				.select('paymentcategory, paymentamount, paymentnotes')
				.in('reservationguestid', [fx.reservationguestid, ...newRgs.map((g) => g.reservationguestid)])
				.gte('paymentdate', today)
		) as { paymentcategory: string; paymentamount: number; paymentnotes: string | null }[];
		const transfer = pays.filter((p) => /transferred/i.test(p.paymentnotes ?? ''));
		expect(transfer).toHaveLength(2);
		expect(transfer.reduce((s, p) => s + Number(p.paymentamount), 0)).toBe(0);

		// Original cancelled and cross-referenced.
		const orig = unwrap(
			await client
				.from('reservations')
				.select('rescancelled, resnotes')
				.eq('reservationid', fx.reservationid)
		) as { rescancelled: boolean; resnotes: string }[];
		expect(orig[0].rescancelled).toBe(true);
		expect(orig[0].resnotes).toContain(String(next.resnumber));
	});
});
