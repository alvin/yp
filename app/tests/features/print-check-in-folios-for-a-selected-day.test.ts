// Story: spec/features/print-check-in-folios-for-a-selected-day.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, printedDate, useAppPage } from '../helpers/app';
import { addDays, cancel, makeReservation, roomDirectory, rpc, todayISO, type Fixture } from '../helpers/db';

const folios = async (date: string) =>
	(
		await rpc<{ resnumber: number }[]>('report_guest_document_queue', {
			p_document: 'check_in_folio',
			p_date: date
		})
	).map((r) => r.resnumber);

let fx: Fixture;
let cancelled: Fixture;

const page = useAppPage();

beforeAll(async () => {
	fx = await makeReservation({ firstname: 'Robin', numadults: 3 });
	cancelled = await makeReservation({ arrival: fx.arrival, roomid: null });
	await cancel(cancelled);
});

describe('print check-in folios for a selected day', () => {
	it("queues the day's arrivals, and no cancelled stay", async () => {
		expect(await folios(fx.arrival)).toEqual([fx.resnumber]);
	});

	it('queues no folio on any other day of the stay', async () => {
		expect(await folios(addDays(fx.arrival, 1))).toEqual([]);
		expect(await folios(fx.departure)).toEqual([]);
	});

	it("shows tomorrow's arrivals from one click in the Print Center", async () => {
		const tomorrow = await makeReservation({
			arrival: addDays(todayISO(), 1),
			nights: 1,
			roomid: null
		});
		await page.goto(`${APP_URL}/print`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Tomorrow', exact: true }).click();
		expect(await page.inputValue('#print-date')).toBe(addDays(todayISO(), 1));
		await page.getByRole('tab', { name: /^Check-in folio/ }).click();
		await page
			.locator(`[role=tabpanel]:visible a[href="/reports/check-in-folio/${tomorrow.resnumber}"]`)
			.waitFor({ timeout: 10_000 });
	});

	it('prints the guest, the number, the stay dates, and the room with its dates and party', async () => {
		const [room] = await roomDirectory();
		await page.goto(`${APP_URL}/reports/check-in-folio/${fx.resnumber}`, { waitUntil: 'networkidle' });
		const sheet = (await page.textContent('.report-page')) ?? '';
		expect(sheet).toContain(`${fx.lastname}, Robin`);
		expect(sheet).toContain(`Res. No. ${fx.resnumber}`);
		expect(sheet).toContain(`Arrival: ${printedDate(fx.arrival)}`);
		expect(sheet).toContain(`Departure: ${printedDate(fx.departure)}`);
		const cells = await page
			.locator('.report-page table')
			.first()
			.locator('tbody tr td')
			.evaluateAll((tds) => tds.map((td) => (td as HTMLElement).innerText.split('\n').pop()?.trim()));
		expect(cells).toEqual([room.room, printedDate(fx.arrival), printedDate(fx.departure), '3']);
	});
});
