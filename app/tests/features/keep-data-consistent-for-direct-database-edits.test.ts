// Story: spec/features/keep-data-consistent-for-direct-database-edits.feature
// These tests write to the tables directly (the "Supabase table editor" path),
// not through workflow RPCs — the triggers must keep everything consistent.

import { beforeAll, describe, expect, it } from 'vitest';
import {
	addDays,
	makeReservation,
	pricedItem,
	roomWindows,
	rpc,
	staffClient,
	todayISO,
	unwrap,
	type Fixture
} from '../helpers/db';

describe('keep data consistent for direct database edits', () => {
	let fx: Fixture;

	beforeAll(async () => {
		fx = await makeReservation();
	});

	it('completes amount and taxes for a raw transaction insert', async () => {
		const client = await staffClient();
		const item = await pricedItem({ gst: true });
		const gst = Number(await rpc('effective_tax_rate', { p_taxratetype: 'GST', p_date: todayISO() }));
		expect(gst).toBeGreaterThan(0);
		const rows = unwrap(
			await client
				.from('transactions')
				.insert({
					reservationguestid: fx.reservationguestid,
					transdate: todayISO(),
					transtype: 'Sundries',
					inventoryid: item.inventoryid,
					transquantity: 2
				})
				.select('transamount, transgstamount')
		) as { transamount: number; transgstamount: number }[];
		const amount = Math.round(item.invamount * 2 * 100) / 100;
		expect(Number(rows[0].transamount)).toBe(amount);
		expect(Number(rows[0].transgstamount)).toBe(Math.round(amount * gst * 100) / 100);
	});

	it('completes code, date, and CDN amount for a raw payment insert', async () => {
		const client = await staffClient();
		const rows = unwrap(
			await client
				.from('payments')
				.insert({
					reservationguestid: fx.reservationguestid,
					paymentcategory: 'Gratuity',
					paymenttype: 'Cash',
					paymentamount: 20,
					paymentcurrency: 'Canadian'
				})
				.select('paymentcode, paymentdate, paymentamountcdn')
		) as { paymentcode: string; paymentdate: string; paymentamountcdn: number }[];
		expect(rows[0].paymentcode).toBe('G01');
		expect(rows[0].paymentdate.slice(0, 10)).toBe(todayISO());
		expect(rows[0].paymentamountcdn).toBe(20);
	});

	it('keeps numnights matching arrival and departure', async () => {
		const client = await staffClient();
		const rows = unwrap(
			await client
				.from('reservations')
				.update({ resdeparturedate: addDays(fx.arrival, 5) })
				.eq('reservationid', fx.reservationid)
				.select('numnights')
		) as { numnights: number }[];
		expect(rows[0].numnights).toBe(5);
	});

	it('keeps cancellation and confirmation dates consistent with their flags', async () => {
		const client = await staffClient();
		const cancelled = unwrap(
			await client
				.from('reservations')
				.update({ rescancelled: true })
				.eq('reservationid', fx.reservationid)
				.select('resdatecancelled')
		) as { resdatecancelled: string | null }[];
		expect(cancelled[0].resdatecancelled?.slice(0, 10)).toBe(todayISO());

		const restored = unwrap(
			await client
				.from('reservations')
				.update({ rescancelled: false })
				.eq('reservationid', fx.reservationid)
				.select('resdatecancelled')
		) as { resdatecancelled: string | null }[];
		expect(restored[0].resdatecancelled).toBeNull();

		const confirmed = unwrap(
			await client
				.from('reservations')
				.update({ resconfirmed: true })
				.eq('reservationid', fx.reservationid)
				.select('resdateconfirmed')
		) as { resdateconfirmed: string | null }[];
		expect(confirmed[0].resdateconfirmed?.slice(0, 10)).toBe(todayISO());
	});

	it('moves reservation-guest dates with the reservation', async () => {
		const fresh = await makeReservation();
		const client = await staffClient();
		const newArrival = addDays(fresh.arrival, 1);
		unwrap(
			await client
				.from('reservations')
				.update({ resarrivaldate: newArrival })
				.eq('reservationid', fresh.reservationid)
				.select()
		);
		const rg = unwrap(
			await client
				.from('reservation_guests')
				.select('checkindate')
				.eq('reservationguestid', fresh.reservationguestid)
		) as { checkindate: string }[];
		expect(rg[0].checkindate.slice(0, 10)).toBe(newArrival);
	});

	it('moves room assignments that ran to the reservation dates with it', async () => {
		const fresh = await makeReservation();
		const client = await staffClient();
		const newDeparture = addDays(fresh.departure, 4);
		unwrap(
			await client
				.from('reservations')
				.update({ resdeparturedate: newDeparture })
				.eq('reservationid', fresh.reservationid)
				.select()
		);
		expect(
			(await roomWindows(fresh)).map((w) => [w.occupancyin, w.occupancyout])
		).toEqual([[fresh.arrival, newDeparture]]);
	});
});
