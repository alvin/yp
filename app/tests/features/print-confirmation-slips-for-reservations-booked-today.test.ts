// Story: spec/features/print-confirmation-slips-for-reservations-booked-today.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { addDays, cancel, isolatedDate, makeReservation, rpc, todayISO, uid, type Fixture } from '../helpers/db';

const slips = async (date: string) =>
	(
		await rpc<{ resnumber: number }[]>('report_guest_document_queue', {
			p_document: 'confirmation',
			p_date: date
		})
	).map((r) => r.resnumber);

let bookedToday: { reservationid: number; resnumber: number };
let cancelledToday: Fixture;
let confirmed: Fixture; // confirmed on a day of its own
let confirmedOn: string;

const page = useAppPage();

beforeAll(async () => {
	// Every fixture is booked now; its booking date is today.
	const guestid = await rpc<number>('create_guest', { p_lastname: `ZZBook-${uid()}` });
	[bookedToday] = await rpc<{ reservationid: number; resnumber: number }[]>('create_reservation', {
		p_guestid: guestid,
		p_arrival: addDays(todayISO(), 90),
		p_departure: addDays(todayISO(), 93),
		p_bookedby: 'QA'
	});
	cancelledToday = await makeReservation({ roomid: null });
	await cancel(cancelledToday, 'none', todayISO());
	confirmed = await makeReservation({ roomid: null });
	confirmedOn = isolatedDate();
	await rpc('confirm_reservation', { p_reservationid: confirmed.reservationid, p_date: confirmedOn });
});

describe('print confirmation slips for reservations booked today', () => {
	it("lists today's slips by default in the Print Center", async () => {
		await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
		expect(await page.inputValue('#print-date')).toBe(todayISO());
		await page.getByRole('tab', { name: /^Confirmation/ }).click();
		await page
			.locator(`[role=tabpanel]:visible a[href="/reports/confirmation/${bookedToday.resnumber}"]`)
			.waitFor({ timeout: 10_000 });
	});

	it('includes only the stays booked or confirmed that day, and leaves cancelled ones out', async () => {
		expect(await slips(todayISO())).toContain(bookedToday.resnumber);
		expect(await slips(todayISO())).not.toContain(cancelledToday.resnumber);
		expect(await slips(confirmedOn)).toEqual([confirmed.resnumber]);
		expect(await slips(addDays(confirmedOn, 1))).toEqual([]);
	});

	it("prints the day's slips together in the batch's confirmation group", async () => {
		await page.goto(`${APP_URL}/print/batch?date=${confirmedOn}`, { waitUntil: 'networkidle' });
		const group = page.locator('[data-testid=group-confirmation]');
		await group.waitFor({ timeout: 15_000 });
		expect(await group.locator('.report-page').count()).toBe(1);
		expect(await group.locator('.report-page').textContent()).toContain(
			`Res. No. ${confirmed.resnumber}`
		);
	});
});
