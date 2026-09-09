// Story: spec/features/capture-housekeeping-and-diet-notes-when-booking.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, staffClient, todayISO, uid, unwrap } from '../helpers/db';

interface HousekeepingRow {
	resnumber: number;
	notes: string | null;
}

interface KitchenRow {
	resnumber: number;
	diet_notes: string | null;
}

let page: Page;
let surname: string;
let resnumber: number;
let reservationid: number;
let guestid: number;
let arrival: string;
let diet = '';

const HK_NOTE = 'Two extra pillows and a crib in the room';
const KITCHEN_NOTE = 'Severe shellfish allergy';

beforeAll(async () => {
	surname = `ZZNotes${uid()}`;
	arrival = addDays(todayISO(), 30);
	page = await openAppPage();

	await page.goto(APP_URL + '/reservations/new', { waitUntil: 'networkidle' });
	await page.fill('#ln', surname);
	await page.fill('#fn', 'Noted');
	await page.fill('#bb', 'QA');
	await page.fill('#arr', arrival);
	await page.fill('#dep', addDays(arrival, 3));

	// Diet comes from the lodge's diet list; the notes beside it are free text.
	await page.click('#diet');
	const option = page.locator('[data-testid=combobox-list] [role=option]').first();
	await option.waitFor({ timeout: 10_000 });
	diet = (await option.textContent())?.trim() ?? '';
	await option.click();

	await page.fill('#kitchen-notes', KITCHEN_NOTE);
	await page.fill('#hk-notes', HK_NOTE);

	await page.getByRole('button', { name: 'Save reservation' }).click();
	await page.waitForURL(/\/reservations\/\d+$/, { timeout: 30_000 });
	resnumber = Number(page.url().split('/').pop());
	const summary = (
		await rpc<{ reservationid: number; primary_guestid: number }[]>('find_reservation', {
			p_resnumber: resnumber
		})
	)[0];
	reservationid = summary.reservationid;
	guestid = summary.primary_guestid;
});

afterAll(async () => {
	await closeApp(page);
});

describe('capture housekeeping and diet notes when booking', () => {
	it('stores the housekeeping note against the stay', async () => {
		const db = await staffClient();
		const rgs = unwrap(
			await db
				.from('reservation_guests')
				.select('reservationguestid')
				.eq('reservationid', reservationid)
		) as { reservationguestid: number }[];
		const notes = unwrap(
			await db
				.from('housekeeping_notes')
				.select('housekeepingnotes, hkarchive')
				.in(
					'reservationguestid',
					rgs.map((r) => r.reservationguestid)
				)
		) as { housekeepingnotes: string; hkarchive: boolean }[];
		expect(notes).toHaveLength(1);
		expect(notes[0].housekeepingnotes).toBe(HK_NOTE);
		expect(notes[0].hkarchive).toBe(false);
	});

	it('stores the diet and its notes against the stay’s guest', async () => {
		const db = await staffClient();
		const meals = unwrap(
			await db.from('kitchen_meals').select('guestdiet, kitchenmealnotes').eq('guestid', guestid)
		) as { guestdiet: string | null; kitchenmealnotes: string | null }[];
		expect(meals).toHaveLength(1);
		expect(meals[0].guestdiet).toBe(diet);
		expect(meals[0].kitchenmealnotes).toBe(KITCHEN_NOTE);
	});

	it('shows the note on the housekeeping report without a further step', async () => {
		const rows = await rpc<HousekeepingRow[]>('report_housekeeping', { p_date: arrival });
		const mine = rows.find((r) => r.resnumber === resnumber);
		expect(mine, 'the new stay is on the housekeeping report').toBeDefined();
		expect(mine!.notes).toBe(HK_NOTE);
	});

	it('shows the diet on the kitchen report without a further step', async () => {
		const rows = await rpc<KitchenRow[]>('report_kitchen_meal', { p_date: arrival });
		const mine = rows.find((r) => r.resnumber === resnumber);
		expect(mine, 'the new stay is on the kitchen report').toBeDefined();
		expect(mine!.diet_notes).toContain(KITCHEN_NOTE);
		expect(mine!.diet_notes).toContain(diet);
	});

	it('records no notes at all when they are left blank', async () => {
		const plain = await makeReservation();
		const db = await staffClient();
		const notes = unwrap(
			await db
				.from('housekeeping_notes')
				.select('housekeepingnotesid')
				.eq('reservationguestid', plain.reservationguestid)
		) as unknown[];
		const meals = unwrap(
			await db.from('kitchen_meals').select('kitchenmealid').eq('guestid', plain.guestid)
		) as unknown[];
		expect(notes).toHaveLength(0);
		expect(meals).toHaveLength(0);
	});
});
