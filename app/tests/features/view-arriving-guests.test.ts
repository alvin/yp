// Story: spec/features/view-arriving-guests.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { isolatedDate, makeReservation, rpc, uid } from '../helpers/db';

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

describe('view arriving guests', () => {
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
});
