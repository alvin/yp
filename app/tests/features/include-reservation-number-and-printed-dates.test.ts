// Story: spec/features/include-reservation-number-and-printed-dates.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, todayISO, type Fixture } from '../helpers/db';

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('confirm_reservation', { p_reservationid: fx.reservationid, p_date: fx.arrival });
});

describe('include reservation number and printed dates', () => {
	it('carries the reservation number on the confirmation slip', async () => {
		const conf = (
			await rpc<{ resnumber: number }[]>('report_reservation_confirmation', {
				p_reservationid: fx.reservationid
			})
		)[0];
		expect(conf.resnumber).toBe(fx.resnumber);
	});

	it('prints the date printed and the date confirmed', async () => {
		const conf = (
			await rpc<{ date_printed: string; date_confirmed: string }[]>(
				'report_reservation_confirmation',
				{ p_reservationid: fx.reservationid }
			)
		)[0];
		expect(conf.date_printed).toBe(todayISO());
		expect(conf.date_confirmed).toBe(fx.arrival);
	});

	it('carries the number and printed date on the folio and bill too', async () => {
		const folio = (
			await rpc<{ resnumber: number; date_printed: string }[]>('report_check_in_folio', {
				p_reservationid: fx.reservationid
			})
		)[0];
		expect(folio.resnumber).toBe(fx.resnumber);
		expect(folio.date_printed).toBe(todayISO());
		const bill = (
			await rpc<{ resnumber: number; date_printed: string }[]>('report_checkout_bill_header', {
				p_reservationid: fx.reservationid
			})
		)[0];
		expect(bill.resnumber).toBe(fx.resnumber);
	});
});
