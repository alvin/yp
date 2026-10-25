// Story: spec/features/assign-reservation-numbers-automatically.feature

import { describe, expect, it } from 'vitest';
import { makeReservation, staffClient, uid, unwrap, isolatedDate, addDays } from '../helpers/db';

describe('assign reservation numbers automatically', () => {
	it('assigns the next in-house number when none is supplied', async () => {
		const a = await makeReservation();
		const b = await makeReservation();
		expect(Number.isInteger(a.resnumber)).toBe(true);
		expect(b.resnumber).toBeGreaterThan(a.resnumber);
	});

	it('assigns unique numbers under concurrency', async () => {
		const made = await Promise.all(Array.from({ length: 6 }, () => makeReservation()));
		const numbers = made.map((m) => m.resnumber);
		expect(new Set(numbers).size).toBe(numbers.length);
	});

	it('continues from the highest stored number', async () => {
		const client = await staffClient();
		const [highest] = unwrap(
			await client
				.from('reservations')
				.select('resnumber')
				.order('resnumber', { ascending: false })
				.limit(1)
		) as { resnumber: number }[];
		const next = await makeReservation();
		expect(next.resnumber).toBeGreaterThan(highest.resnumber);
	});

	it('keeps an explicitly supplied number', async () => {
		const client = await staffClient();
		// Strictly below the lowest stored number: guaranteed unused, and it can
		// never ratchet the lodge's numbering sequence upward (the sequence only
		// syncs to max(resnumber), so explicit test numbers must stay below max).
		const minRow = unwrap(
			await client
				.from('reservations')
				.select('resnumber')
				.order('resnumber', { ascending: true })
				.limit(1)
		) as { resnumber: number }[];
		const explicit = (minRow[0]?.resnumber ?? 501) - 1;
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
