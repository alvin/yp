// Story: spec/features/assign-reservation-numbers-automatically.feature

import { describe, expect, it } from 'vitest';
import { makeReservation, rpc, staffClient, uid, unwrap, isolatedDate, addDays } from '../helpers/db';

describe('assign reservation numbers automatically', () => {
	it('assigns the next in-house number when none is supplied', async () => {
		const a = await makeReservation();
		const b = await makeReservation();
		expect(a.resnumber).toBeGreaterThan(0);
		expect(b.resnumber).toBeGreaterThan(a.resnumber);
	});

	it('assigns unique numbers under concurrency', async () => {
		const made = await Promise.all(Array.from({ length: 6 }, () => makeReservation()));
		const numbers = made.map((m) => m.resnumber);
		expect(new Set(numbers).size).toBe(numbers.length);
	});

	it('continues from the highest stored number', async () => {
		const before = await makeReservation();
		const after = await makeReservation();
		const client = await staffClient();
		const max = unwrap(
			await client
				.from('reservations')
				.select('resnumber')
				.order('resnumber', { ascending: false })
				.limit(1)
		) as { resnumber: number }[];
		expect(after.resnumber).toBeGreaterThan(before.resnumber);
		expect(max[0].resnumber).toBeGreaterThanOrEqual(after.resnumber);
	});

	it('keeps an explicitly supplied number', async () => {
		const client = await staffClient();
		// Far outside the sequence range so it can't collide with assigned numbers.
		const explicit = 90_000_000 + (Date.now() % 1_000_000);
		const arrival = isolatedDate();
		const rows = unwrap(
			await client
				.from('reservations')
				.insert({
					resnumber: explicit,
					resbookedby: 'QA',
					resarrivaldate: arrival,
					resdeparturedate: addDays(arrival, 2),
					numadults: 2,
					resgroupname: `explicit-${uid()}`
				})
				.select('resnumber')
		) as { resnumber: number }[];
		expect(rows[0].resnumber).toBe(explicit);
	});
});
