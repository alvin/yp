// Story: spec/features/search-by-arrival-date.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { addDays, isolatedDate, makeReservation, rpc, uid, type Fixture } from '../helpers/db';

interface DateRow {
	reservationid: number;
	resnumber: number;
	guestlastname: string;
	arrival_date: string;
	departure_date: string;
	match_type: string;
}

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
});

describe('search by arrival date', () => {
	it('treats the selected date as an arrival-date search by default', async () => {
		// No p_mode: the function's default mode applies.
		const rows = await rpc<DateRow[]>('search_by_date', { p_date: fx.arrival });
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit).toBeDefined();
		expect(hit!.match_type).toBe('arrival');
	});

	it('shows reservations arriving on the chosen date', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: fx.arrival,
			p_mode: 'arrivals'
		});
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit).toBeDefined();
		expect(hit!.arrival_date).toBe(fx.arrival);
		expect(hit!.guestlastname).toBe(fx.lastname);
	});

	it('is driven from a single selected date', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: addDays(fx.arrival, 1),
			p_mode: 'arrivals'
		});
		expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(false);
	});

	it('lets staff open a listed reservation from the results', async () => {
		const rows = await rpc<DateRow[]>('search_by_date', {
			p_date: fx.arrival,
			p_mode: 'arrivals'
		});
		const hit = rows.find((r) => r.resnumber === fx.resnumber);
		expect(hit).toBeDefined();
		const res = await rpc<{ reservationid: number; resnumber: number }[]>('find_reservation', {
			p_resnumber: hit!.resnumber
		});
		expect(res).toHaveLength(1);
		expect(res[0].reservationid).toBe(fx.reservationid);
	});
});

describe('search by arrival date — the arrivals list', () => {
	let date: string;
	let first: string;
	let second: string;

	beforeAll(async () => {
		date = isolatedDate();
		const tag = uid();
		first = `ZZArrA-${tag}`;
		second = `ZZArrB-${tag}`;
		// Created in reverse order to prove the sort is alphabetical, not insertion.
		await makeReservation({ lastname: second, arrival: date, nights: 2 });
		await makeReservation({ lastname: first, arrival: date, nights: 2 });
	});

	it('lists the guests arriving on the selected date', async () => {
		const rows = await rpc<{ guestlastname: string; match_type: string }[]>('search_by_date', {
			p_date: date,
			p_mode: 'arrivals'
		});
		expect(rows.map((r) => r.guestlastname)).toEqual([first, second]);
		expect(rows.every((r) => r.match_type === 'arrival')).toBe(true);
	});

	it('shows stay context (dates, party, deposit state) per row', async () => {
		const rows = await rpc<
			{ arrival_date: string; departure_date: string; pax: number; deposit_cdn: number }[]
		>('search_by_date', { p_date: date, p_mode: 'arrivals' });
		expect(rows[0].arrival_date).toBe(date);
		expect(rows[0].pax).toBeGreaterThan(0);
		expect(Number(rows[0].deposit_cdn)).toBe(0);
	});

	it('shows the deposit still held, net of any refunded, applied or kept', async () => {
		const held = await makeReservation({ arrival: isolatedDate(), nights: 2 });
		for (const [category, amount] of [
			['Deposit (Received)', 200],
			['Deposit (Applied)', 50],
			['Deposit (Kept)', 30]
		] as const) {
			await rpc('record_payment', {
				p_reservationguestid: held.reservationguestid,
				p_paymentcategory: category,
				p_paymenttype: 'Visa',
				p_amount: amount,
				p_paymentdate: held.arrival
			});
		}
		const rows = await rpc<{ resnumber: number; deposit_cdn: number }[]>('search_by_date', {
			p_date: held.arrival,
			p_mode: 'arrivals'
		});
		expect(Number(rows.find((r) => r.resnumber === held.resnumber)?.deposit_cdn)).toBe(120);
	});
});
