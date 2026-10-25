// Story: spec/features/generate-guest-document-queues-through-shared-queue-service-by-o.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { cancel, makeReservation, rpc, type Fixture } from '../helpers/db';

let arriving: Fixture; // confirmed on its arrival day
let cancelled: Fixture; // cancelled that same day

const page = useAppPage('/print');
const panel = () => page.locator('[role=tabpanel]:visible');

async function openTab(name: string): Promise<void> {
	await page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();
}

async function listed(name: string): Promise<string[]> {
	await openTab(name);
	return (await panel().locator('a[href^="/reports/"]').allTextContents()).map((t) =>
		t.replace(/\s+/g, ' ').trim()
	);
}

beforeAll(async () => {
	arriving = await makeReservation();
	await rpc('confirm_reservation', { p_reservationid: arriving.reservationid, p_date: arriving.arrival });
	cancelled = await makeReservation({ roomid: null });
	await cancel(cancelled, 'none', arriving.arrival);
});

describe('generate guest document queues through the shared queue service', () => {
	it('lists each document’s queue for the report date on its own tab, each row the same way', async () => {
		await page.fill('#print-date', arriving.arrival);
		const row = (fx: Fixture, reason: string) => `${fx.lastname}, Test #${fx.resnumber} ${reason}`;
		await expect
			.poll(() => listed('Confirmation'), { timeout: 10_000 })
			.toEqual([row(arriving, 'reservation booked or confirmed on selected day')]);
		expect(await listed('Check-in folio')).toEqual([row(arriving, 'arrival on selected day')]);
		expect(await listed('Check-out bill')).toEqual([]);
		expect(await listed('Cancellation')).toEqual([row(cancelled, 'cancelled on selected day')]);
	});

	it('rebuilds every list from a new date alone', async () => {
		await page.fill('#print-date', arriving.departure);
		await expect
			.poll(() => listed('Check-out bill'), { timeout: 10_000 })
			.toEqual([expect.stringContaining(`#${arriving.resnumber}`)]);
		expect(await listed('Check-in folio')).toEqual([]);
		expect(await listed('Confirmation')).toEqual([]);
		expect(await listed('Cancellation')).toEqual([]);
	});

	it('opens a listed document ready to print', async () => {
		await openTab('Check-out bill');
		await panel().locator(`a[href="/reports/checkout-bill/${arriving.resnumber}"]`).click();
		await page.waitForURL(`${APP_URL}/reports/checkout-bill/${arriving.resnumber}`, {
			timeout: 15_000
		});
		await expect.poll(() => page.textContent('.report-page')).toContain(String(arriving.resnumber));
		await page.getByRole('button', { name: 'Print', exact: true }).waitFor();
	});
});
