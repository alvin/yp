// Story: spec/features/keep-office-notes-private.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, staffClient, uid, unwrap, type Fixture } from '../helpers/db';

let fx: Fixture;
const marker = `OFFICE-${uid()}`;

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('set_guest_notes', { p_guestid: fx.guestid, p_notes: `${marker} guest` });
	await rpc('set_reservation_notes', { p_reservationid: fx.reservationid, p_notes: `${marker} stay` });
	// Notes that do print sit alongside, so every report has the stay on it.
	await rpc('update_reservation_guest', {
		p_reservationguestid: fx.reservationguestid,
		p_rgnotes: 'Printable request'
	});
	await rpc('save_kitchen_meal', { p_guestid: fx.guestid, p_guestdiet: null, p_notes: 'No nuts' });
});

describe('keep office notes private — never printed', () => {
	it('prints neither on the daily reports', async () => {
		const day = addDays(fx.arrival, 1);
		for (const fn of ['report_housekeeping', 'report_in_house', 'report_kitchen_meal', 'report_requests']) {
			const text = JSON.stringify(await rpc(fn, { p_date: day }));
			expect(text).toContain(String(fx.resnumber));
			expect(text).not.toContain(marker);
		}
	});

	it('prints neither on the guest documents', async () => {
		const documents = async (fns: string[]) => {
			for (const fn of fns) {
				const text = JSON.stringify(await rpc(fn, { p_reservationid: fx.reservationid }));
				expect(text).toContain(String(fx.resnumber));
				expect(text).not.toContain(marker);
			}
		};
		await documents([
			'report_reservation_confirmation',
			'report_check_in_folio',
			'report_checkout_bill_header'
		]);
		await rpc('cancel_reservation', {
			p_reservationid: fx.reservationid,
			p_date: fx.arrival,
			p_deposit_handling: 'none'
		});
		await documents(['report_cancellation_notice']);
	});
});

describe('keep office notes private — on screen', () => {
	const page = useAppPage();
	const dialog = () => page.getByRole('dialog');

	async function openNotes(button: string) {
		await page.getByRole('button', { name: button }).click();
		await dialog().locator('textarea').waitFor();
	}

	async function saveNotes(text: string, toast: string) {
		await dialog().locator('textarea').fill(text);
		await dialog().getByRole('button', { name: 'Save notes' }).click();
		await page.getByText(toast).last().waitFor({ timeout: 10_000 });
	}

	it("opens the guest's notes from the guest's page, marked office only, and saves them", async () => {
		await page.goto(`${APP_URL}/guests/${fx.guestid}`, { waitUntil: 'networkidle' });
		await openNotes('Guest notes');
		expect(await dialog().locator('textarea').inputValue()).toBe(`${marker} guest`);
		expect(await dialog().textContent()).toContain('Office only.');
		await saveNotes(`${marker} guest, revised`, 'Guest notes saved');
		const guest = unwrap(
			await (await staffClient()).from('guests').select('guestnotes').eq('guestid', fx.guestid)
		) as { guestnotes: string }[];
		expect(guest[0].guestnotes).toBe(`${marker} guest, revised`);
	});

	it("opens the reservation's notes from the reservation screen, marked office only, and saves them", async () => {
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
		const button = page.getByRole('button', { name: 'Reservation notes' });
		expect(await button.locator('span.rounded-full').count()).toBe(1);
		await openNotes('Reservation notes');
		expect(await dialog().locator('textarea').inputValue()).toBe(`${marker} stay`);
		expect(await dialog().textContent()).toContain('Office only.');
		await saveNotes('', 'Reservation notes saved');
		await expect.poll(() => button.locator('span.rounded-full').count(), { timeout: 10_000 }).toBe(0);
		const stay = unwrap(
			await (await staffClient())
				.from('reservations')
				.select('resnotes')
				.eq('reservationid', fx.reservationid)
		) as { resnotes: string | null }[];
		expect(stay[0].resnotes).toBeNull();
	});

	it("keeps the guest's notes with the guest on a later stay", async () => {
		const [later] = await rpc<{ resnumber: number }[]>('create_reservation', {
			p_guestid: fx.guestid,
			p_arrival: addDays(fx.arrival, 400),
			p_departure: addDays(fx.arrival, 402),
			p_bookedby: 'QA',
			p_numadults: 2
		});
		await page.goto(`${APP_URL}/reservations/${later.resnumber}`, { waitUntil: 'networkidle' });
		await openNotes('Guest notes');
		expect(await dialog().locator('textarea').inputValue()).toBe(`${marker} guest, revised`);
	});
});
