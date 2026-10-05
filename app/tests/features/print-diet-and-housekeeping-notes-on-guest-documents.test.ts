// Story: spec/features/print-diet-and-housekeeping-notes-on-guest-documents.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { addDays, makeReservation, rpc, staffClient, uid, unwrap, type Fixture } from '../helpers/db';

interface GuestDocumentNotes {
	diet_notes: string | null;
	housekeeping_notes: string | null;
}

async function confirmation(reservationid: number): Promise<GuestDocumentNotes> {
	return (
		await rpc<GuestDocumentNotes[]>('report_reservation_confirmation', {
			p_reservationid: reservationid
		})
	)[0];
}

async function folio(reservationid: number): Promise<GuestDocumentNotes> {
	return (
		await rpc<GuestDocumentNotes[]>('report_check_in_folio', { p_reservationid: reservationid })
	)[0];
}

let full: Fixture; // a diet and a housekeeping note revised once
let plain: Fixture; // neither
let earlier: string;
let latest: string;

beforeAll(async () => {
	full = await makeReservation();
	await rpc('save_kitchen_meal', {
		p_guestid: full.guestid,
		p_guestdiet: 'Vegan',
		p_notes: '1 vegan'
	});
	earlier = `twin beds ${uid()}`;
	latest = `split beds ${uid()}`;
	await rpc('add_housekeeping_note', {
		p_reservationguestid: full.reservationguestid,
		p_notes: earlier,
		p_date: addDays(full.arrival, -20)
	});
	await rpc('add_housekeeping_note', {
		p_reservationguestid: full.reservationguestid,
		p_notes: latest,
		p_date: addDays(full.arrival, -10)
	});

	plain = await makeReservation();
});

describe('print diet and housekeeping notes on guest documents', () => {
	it("shows the diet on the confirmation in the kitchen report's wording", async () => {
		const kitchen = await rpc<{ resnumber: number; diet_notes: string }[]>(
			'report_kitchen_meal',
			{ p_date: full.arrival }
		);
		const kitchenDiet = kitchen.find((k) => k.resnumber === full.resnumber)!.diet_notes;
		expect((await confirmation(full.reservationid)).diet_notes).toBe(kitchenDiet);
		expect(kitchenDiet).toContain('1 vegan');
	});

	it('shows the housekeeping note on the confirmation as the housekeeping report prints it', async () => {
		const housekeeping = await rpc<{ resnumber: number; notes: string | null }[]>(
			'report_housekeeping',
			{ p_date: full.arrival }
		);
		const row = housekeeping.find((h) => h.resnumber === full.resnumber)!;
		expect((await confirmation(full.reservationid)).housekeeping_notes).toBe(row.notes);
	});

	it('shows the same diet and housekeeping note on the check-in folio', async () => {
		const conf = await confirmation(full.reservationid);
		const onFolio = await folio(full.reservationid);
		expect(onFolio.diet_notes).toBe(conf.diet_notes);
		expect(onFolio.housekeeping_notes).toBe(conf.housekeeping_notes);
		expect(onFolio.housekeeping_notes).toBeTruthy();
	});

	it('prints only the latest housekeeping note', async () => {
		const { housekeeping_notes } = await folio(full.reservationid);
		expect(housekeeping_notes).toBe(latest);
		expect(housekeeping_notes).not.toContain(earlier);
	});

	it('leaves a stay with neither note as it was', async () => {
		for (const doc of [
			await confirmation(plain.reservationid),
			await folio(plain.reservationid)
		]) {
			expect(doc).toMatchObject({ diet_notes: null, housekeeping_notes: null });
		}
	});
});

describe('print diet and housekeeping notes on guest documents — on paper', () => {
	let page: Page;

	beforeAll(async () => {
		page = await openAppPage();
	});

	afterAll(async () => {
		await closeApp(page);
	});

	async function sheet(path: string): Promise<string> {
		await page.goto(`${APP_URL}${path}`, { waitUntil: 'networkidle' });
		return (await page.textContent('.report-page')) ?? '';
	}

	for (const [name, path] of [
		['confirmation', 'confirmation'],
		['check-in folio', 'check-in-folio']
	] as const) {
		it(`prints both notes on the ${name}`, async () => {
			const text = await sheet(`/reports/${path}/${full.resnumber}`);
			expect(text).toContain('Diet:');
			expect(text).toContain('1 vegan');
			expect(text).toContain('Housekeeping:');
			expect(text).toContain(latest);
		});

		it(`prints no note lines on the ${name} of a stay without them`, async () => {
			const text = await sheet(`/reports/${path}/${plain.resnumber}`);
			expect(text).not.toContain('Diet:');
			expect(text).not.toContain('Housekeeping:');
		});
	}
});

describe('print diet and housekeeping notes on guest documents — office notes stay in the office', () => {
	let stay: Fixture;
	const marker = `OFFICE-${uid()}`;

	beforeAll(async () => {
		stay = await makeReservation();
		await rpc('set_guest_notes', { p_guestid: stay.guestid, p_notes: `${marker} guest` });
		await rpc('update_reservation_guest', {
			p_reservationguestid: stay.reservationguestid,
			p_rgnotes: `${marker} request`
		});
		const db = await staffClient();
		unwrap(
			await db
				.from('room_assignments')
				.update({ occupancynotes: `${marker} room` })
				.eq('reservationguestid', stay.reservationguestid)
				.select('occupancyid')
		);
	});

	it('never prints them on the confirmation, folio, bill or cancellation notice', async () => {
		const documents = async (fns: string[]) => {
			for (const fn of fns) {
				const rows = await rpc<Record<string, unknown>[]>(fn, { p_reservationid: stay.reservationid });
				const text = JSON.stringify(rows);
				// The stay itself is on the document; only the office notes are not.
				if (!fn.endsWith('_lines')) expect(text).toContain(String(stay.resnumber));
				expect(text).not.toContain(marker);
			}
		};
		await documents([
			'report_reservation_confirmation',
			'report_check_in_folio',
			'report_checkout_bill_header',
			'report_checkout_bill_lines'
		]);
		// A cancellation notice is printed once the stay is cancelled.
		await rpc('cancel_reservation', {
			p_reservationid: stay.reservationid,
			p_date: stay.arrival,
			p_deposit_handling: 'none'
		});
		await documents(['report_cancellation_notice']);
	});
});

describe('print diet and housekeeping notes on guest documents — the notes tabs', () => {
	let page: Page;

	async function housekeepingNotes(): Promise<string[]> {
		const db = await staffClient();
		return (
			unwrap(
				await db
					.from('housekeeping_notes')
					.select('housekeepingnotes')
					.eq('reservationguestid', full.reservationguestid)
					.eq('hkarchive', false)
			) as { housekeepingnotes: string }[]
		).map((h) => h.housekeepingnotes);
	}

	beforeAll(async () => {
		page = await openAppPage();
		await page.goto(`${APP_URL}/reservations/${full.resnumber}`, { waitUntil: 'networkidle' });
	});

	afterAll(async () => {
		await closeApp(page);
	});

	it('edits only the diet notes, leaving the diet as it is', async () => {
		await page.getByRole('tab', { name: 'Kitchen' }).click();
		const box = page.locator('[role=tabpanel][data-state=active] textarea');
		expect(await box.inputValue()).toBe('1 vegan');
		await page.locator('[role=tabpanel][data-state=active]').getByRole('button', { name: 'Save' }).click();
		await page.getByText('Kitchen notes saved').waitFor({ timeout: 10_000 });
		expect((await confirmation(full.reservationid)).diet_notes).toBe('Vegan 1 vegan');
	});

	it('edits the housekeeping note in force, and saving it unchanged adds nothing', async () => {
		const before = await housekeepingNotes();
		await page.getByRole('tab', { name: 'Housekeeping' }).click();
		const box = page.locator('[role=tabpanel][data-state=active] textarea');
		expect(await box.inputValue()).toBe(latest);
		await page.locator('[role=tabpanel][data-state=active]').getByRole('button', { name: 'Save' }).click();
		await page.getByText('Housekeeping notes saved').waitFor({ timeout: 10_000 });
		expect(await housekeepingNotes()).toEqual(before);
		expect((await folio(full.reservationid)).housekeeping_notes).toBe(latest);
	});

	it('clears the housekeeping note when the box is emptied, keeping its history', async () => {
		await page.getByRole('tab', { name: 'Housekeeping' }).click();
		await page.locator('[role=tabpanel][data-state=active] textarea').fill('');
		await page.locator('[role=tabpanel][data-state=active]').getByRole('button', { name: 'Save' }).click();
		await page.getByText('Housekeeping notes saved').last().waitFor({ timeout: 10_000 });
		await expect
			.poll(async () => (await folio(full.reservationid)).housekeeping_notes, { timeout: 10_000 })
			.toBeNull();
		const db = await staffClient();
		const history = unwrap(
			await db
				.from('housekeeping_notes')
				.select('housekeepingnotes')
				.eq('reservationguestid', full.reservationguestid)
		) as { housekeepingnotes: string }[];
		expect(history.map((h) => h.housekeepingnotes)).toEqual(expect.arrayContaining([earlier, latest]));
	});

	it('clears the diet when it is set to None and its notes emptied', async () => {
		await page.getByRole('tab', { name: 'Kitchen' }).click();
		await page.click('#kitchen-diet');
		await page.locator('[data-testid=combobox-list] [role=option]', { hasText: 'None' }).click();
		await page.locator('[role=tabpanel][data-state=active] textarea').fill('');
		await page.locator('[role=tabpanel][data-state=active]').getByRole('button', { name: 'Save' }).click();
		await expect
			.poll(async () => (await confirmation(full.reservationid)).diet_notes, { timeout: 10_000 })
			.toBeNull();
	});
});
