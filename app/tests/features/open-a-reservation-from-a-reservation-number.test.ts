// Story: spec/features/open-a-reservation-from-a-reservation-number.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { makeReservation, rpc, type Fixture } from '../helpers/db';

let fx: Fixture;

const page = useAppPage();

beforeAll(async () => {
	fx = await makeReservation();
});

describe('open a reservation from a reservation number', () => {
	it('finds the matching reservation record', async () => {
		const rows = await rpc<{ reservationid: number; guest_name: string }[]>('find_reservation', {
			p_resnumber: fx.resnumber
		});
		expect(rows).toHaveLength(1);
		expect(rows[0].reservationid).toBe(fx.reservationid);
		expect(rows[0].guest_name).toContain(fx.lastname);
	});

	it('opens the transaction screen for the number entered on the lookup screen', async () => {
		await page.goto(APP_URL + '/', { waitUntil: 'networkidle' });
		await page.getByRole('tab', { name: 'Res #', exact: true }).click();
		await page.fill('#res-q', String(fx.resnumber));
		await page.press('#res-q', 'Enter');
		await page.waitForURL(`${APP_URL}/reservations/${fx.resnumber}`, { timeout: 20_000 });
	});

	it('carries the reservation number into the transaction screen', async () => {
		await expect.poll(() => page.textContent('h1')).toBe(`Reservation #${fx.resnumber}`);
	});
});
