// Story: spec/features/render-and-print-reservation-confirmation.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, printedDate, useAppPage } from '../helpers/app';
import { addDays, makeReservation, pay, roomDirectory, rpc, todayISO, type Fixture, type RoomRow } from '../helpers/db';

let fx: Fixture;
let room: RoomRow;
const confirmedOn = '2026-03-02';
let sheet: string;

describe('render and print reservation confirmation', () => {
	const page = useAppPage();

	beforeAll(async () => {
		room = (await roomDirectory())[0];
		fx = await makeReservation({ roomid: room.roomid, numadults: 3 });
		await pay(fx, 'Deposit (Received)', 95, { date: addDays(fx.arrival, -30) });
		await rpc('confirm_reservation', { p_reservationid: fx.reservationid, p_date: confirmedOn });
		await page.goto(`${APP_URL}/reports/confirmation/${fx.resnumber}`, { waitUntil: 'networkidle' });
		sheet = (await page.textContent('.report-page')) ?? '';
	});

	it('shows the guest and mailing address, the number, and the dates confirmed and printed', () => {
		expect(sheet.toUpperCase()).toContain(fx.lastname.toUpperCase());
		expect(sheet).toContain('Ladysmith, BC'); // printed in capitals by the stylesheet
		expect(sheet).toContain(`Res. No. ${fx.resnumber}`);
		expect(sheet).toContain(`Date Confirmed:  ${printedDate(confirmedOn)}`);
		expect(sheet).toContain(`Date Printed:  ${printedDate(todayISO())}`);
	});

	it('shows the stay, its room with its dates and guests, and the deposit received', async () => {
		expect(sheet).toContain(`Arrival:  ${printedDate(fx.arrival)}`);
		expect(sheet).toContain(`Departure:  ${printedDate(fx.departure)}`);
		const row = (await page.locator('.report-page tbody tr').first().textContent()) ?? '';
		for (const s of [room.room, printedDate(fx.arrival), printedDate(fx.departure), '# Guests 3'])
			expect(row).toContain(s);
		expect(sheet).toMatch(new RegExp(`Deposit \\(Received\\)\\s*\\$95\\.00\\s*${printedDate(addDays(fx.arrival, -30))}`));
	});

	it('closes with the lodge phone, and prints from its own screen', async () => {
		expect(sheet).toContain('Phone (250) 245-7422');
		expect(await page.getByRole('button', { name: 'Print' }).isVisible()).toBe(true);
	});

	it('carries the number and date printed on the check-in folio and the check-out bill', async () => {
		for (const fn of ['report_check_in_folio', 'report_checkout_bill_header']) {
			const [doc] = await rpc<{ resnumber: number; date_printed: string }[]>(fn, {
				p_reservationid: fx.reservationid
			});
			expect(doc).toMatchObject({ resnumber: fx.resnumber, date_printed: todayISO() });
		}
	});
});
