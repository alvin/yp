// Story: spec/features/edit-the-notes-for-reports.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import {
	addDays,
	firstOccupancyId,
	makeReservation,
	roomDirectory,
	roomWindows,
	rpc,
	staffClient,
	uid,
	unwrap,
	type Fixture
} from '../helpers/db';

async function inHouseNotes(fx: Fixture): Promise<string | null> {
	const rows = await rpc<{ resnumber: number; occupancy_notes: string | null }[]>(
		'report_in_house',
		{ p_date: addDays(fx.arrival, 1) }
	);
	return rows.find((r) => r.resnumber === fx.resnumber)?.occupancy_notes ?? null;
}

async function requestsReport(fx: Fixture): Promise<string | null> {
	const rows = await rpc<{ resnumber: number; request: string | null }[]>('report_requests', {
		p_date: addDays(fx.arrival, 1)
	});
	return rows.find((r) => r.resnumber === fx.resnumber)?.request ?? null;
}

async function occupancyNotes(fx: Fixture): Promise<(string | null)[]> {
	const db = await staffClient();
	const rows = unwrap(
		await db
			.from('room_assignments')
			.select('occupancynotes')
			.eq('reservationguestid', fx.reservationguestid)
			.eq('occupancyarchive', false)
			.order('occupancyid')
	) as { occupancynotes: string | null }[];
	return rows.map((r) => r.occupancynotes);
}

async function confirmation(fx: Fixture) {
	return (
		await rpc<{ diet_notes: string | null; housekeeping_notes: string | null }[]>(
			'report_reservation_confirmation',
			{ p_reservationid: fx.reservationid }
		)
	)[0];
}

describe('edit the notes for reports — the daily reports', () => {
	let fx: Fixture;
	let mid: string;
	const marker = `QA-NOTE-${uid()}`;

	beforeAll(async () => {
		fx = await makeReservation();
		mid = addDays(fx.arrival, 1);
		await rpc('add_housekeeping_note', {
			p_reservationguestid: fx.reservationguestid,
			p_notes: `HK ${marker}`,
			p_date: mid
		});
		await rpc('save_kitchen_meal', { p_guestid: fx.guestid, p_guestdiet: null, p_notes: `KM ${marker}` });
		await rpc('update_reservation_guest', {
			p_reservationguestid: fx.reservationguestid,
			p_rgnotes: `RG ${marker}`
		});
		await rpc('set_occupancy_notes', {
			p_occupancyid: await firstOccupancyId(fx),
			p_notes: `OCC ${marker}`
		});
	});

	it('prints the housekeeping note on the housekeeping report', async () => {
		const rows = await rpc<{ resnumber: number; notes: string | null }[]>('report_housekeeping', {
			p_date: mid
		});
		expect(rows.find((r) => r.resnumber === fx.resnumber)?.notes).toBe(`HK ${marker}`);
	});

	it('prints the kitchen notes on the kitchen report', async () => {
		const rows = await rpc<{ resnumber: number; diet_notes: string | null }[]>(
			'report_kitchen_meal',
			{ p_date: mid }
		);
		expect(rows.find((r) => r.resnumber === fx.resnumber)?.diet_notes).toBe(`KM ${marker}`);
	});

	it('prints the occupancy notes on the In House report, and the requests on the Requests report only', async () => {
		expect(await inHouseNotes(fx)).toBe(`OCC ${marker}`);
		expect(await requestsReport(fx)).toBe(`RG ${marker}`);
	});
});

describe('edit the notes for reports — the tabs', () => {
	const page = useAppPage();
	let fx: Fixture;
	const panel = () => page.locator('[role=tabpanel][data-state=active]');

	async function openTab(name: string) {
		await page.getByRole('tab', { name }).click();
	}

	async function saveTab(toast: string) {
		await panel().getByRole('button', { name: 'Save' }).click();
		await page.getByText(toast).last().waitFor({ timeout: 10_000 });
	}

	beforeAll(async () => {
		fx = await makeReservation();
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
	});

	it('has a tab each for Kitchen, Housekeeping, Requests and Occupancy', async () => {
		const card = page.locator('[data-slot=card]', { hasText: 'Notes for reports' });
		expect(await card.getByRole('tab').allTextContents()).toEqual([
			'Kitchen',
			'Housekeeping',
			'Requests',
			'Occupancy'
		]);
	});

	it('saves the requests, which print on the Requests report and not the In House report', async () => {
		await openTab('Requests');
		await panel().locator('textarea').fill('Late checkout please');
		await saveTab('Request notes saved');
		await expect.poll(() => requestsReport(fx), { timeout: 10_000 }).toBe('Late checkout please');
		expect(await inHouseNotes(fx)).toBeNull();
	});

	it("saves a one-room stay's occupancy notes from a single box, changing only that note", async () => {
		await openTab('Occupancy');
		expect(await panel().locator('textarea').count()).toBe(1);
		expect(await panel().locator('label').count()).toBe(0);
		await panel().locator('textarea').fill('Joining Laura');
		await saveTab('Occupancy notes saved');
		await expect
			.poll(() => inHouseNotes(fx), { timeout: 10_000 })
			.toBe('Joining Laura');
	});

	it('clears the occupancy notes when the box is emptied', async () => {
		await openTab('Occupancy');
		await panel().locator('textarea').fill('');
		await saveTab('Occupancy notes saved');
		await expect.poll(() => occupancyNotes(fx), { timeout: 10_000 }).toEqual([null]);
	});

	it('gives each room of a stay its own box, named by the room and its dates', async () => {
		const stay = await makeReservation();
		const second = (await roomDirectory())[1];
		await rpc('assign_room', {
			p_reservationguestid: stay.reservationguestid,
			p_roomid: second.roomid,
			p_occupancyin: stay.arrival,
			p_occupancyout: stay.departure
		});
		expect(await roomWindows(stay)).toHaveLength(2);
		await page.goto(`${APP_URL}/reservations/${stay.resnumber}`, { waitUntil: 'networkidle' });
		await openTab('Occupancy');
		const labels = await panel().locator('label').allTextContents();
		expect(labels).toHaveLength(2);
		expect(labels[1]).toContain(second.room_compact);
		await panel().locator('textarea').nth(1).fill('Daughter joins');
		await saveTab('Occupancy notes saved');
		await expect.poll(() => occupancyNotes(stay), { timeout: 10_000 }).toEqual([null, 'Daughter joins']);
	});
});

describe('edit the notes for reports — diet and housekeeping', () => {
	const page = useAppPage();
	let fx: Fixture;
	let earlier: string;
	let latest: string;
	const panel = () => page.locator('[role=tabpanel][data-state=active]');

	async function housekeepingNotes(): Promise<string[]> {
		const db = await staffClient();
		return (
			unwrap(
				await db
					.from('housekeeping_notes')
					.select('housekeepingnotes')
					.eq('reservationguestid', fx.reservationguestid)
					.eq('hkarchive', false)
			) as { housekeepingnotes: string }[]
		).map((h) => h.housekeepingnotes);
	}

	beforeAll(async () => {
		fx = await makeReservation();
		await rpc('save_kitchen_meal', { p_guestid: fx.guestid, p_guestdiet: 'Vegan', p_notes: '1 vegan' });
		earlier = `twin beds ${uid()}`;
		latest = `split beds ${uid()}`;
		for (const [notes, days] of [
			[earlier, -20],
			[latest, -10]
		] as const)
			await rpc('add_housekeeping_note', {
				p_reservationguestid: fx.reservationguestid,
				p_notes: notes,
				p_date: addDays(fx.arrival, days)
			});
		await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
	});

	it('shows the diet notes as they print, the type from Access included, and saving them repeats nothing', async () => {
		await page.getByRole('tab', { name: 'Kitchen' }).click();
		expect(await panel().locator('[data-slot=combobox-trigger]').count()).toBe(0);
		expect(await panel().locator('textarea').inputValue()).toBe('Vegan 1 vegan');
		await panel().getByRole('button', { name: 'Save' }).click();
		await page.getByText('Kitchen notes saved').waitFor({ timeout: 10_000 });
		expect((await confirmation(fx)).diet_notes).toBe('Vegan 1 vegan');
	});

	it('edits the housekeeping note in force, and saving it unchanged adds nothing', async () => {
		const before = await housekeepingNotes();
		await page.getByRole('tab', { name: 'Housekeeping' }).click();
		expect(await panel().locator('textarea').inputValue()).toBe(latest);
		await panel().getByRole('button', { name: 'Save' }).click();
		await page.getByText('Housekeeping notes saved').waitFor({ timeout: 10_000 });
		expect(await housekeepingNotes()).toEqual(before);
	});

	it('clears the housekeeping note when the box is emptied, keeping its history', async () => {
		await page.getByRole('tab', { name: 'Housekeeping' }).click();
		await panel().locator('textarea').fill('');
		await panel().getByRole('button', { name: 'Save' }).click();
		await expect
			.poll(async () => (await confirmation(fx)).housekeeping_notes, { timeout: 10_000 })
			.toBeNull();
		const db = await staffClient();
		const history = unwrap(
			await db
				.from('housekeeping_notes')
				.select('housekeepingnotes')
				.eq('reservationguestid', fx.reservationguestid)
		) as { housekeepingnotes: string }[];
		expect(history.map((h) => h.housekeepingnotes)).toEqual(expect.arrayContaining([earlier, latest]));
	});

	it('clears the diet when its notes are emptied', async () => {
		await page.getByRole('tab', { name: 'Kitchen' }).click();
		await panel().locator('textarea').fill('');
		await panel().getByRole('button', { name: 'Save' }).click();
		await expect.poll(async () => (await confirmation(fx)).diet_notes, { timeout: 10_000 }).toBeNull();
	});

	it('revises the diet it saved when the notes are saved again, rather than filing a second', async () => {
		const stay = await makeReservation();
		await page.goto(`${APP_URL}/reservations/${stay.resnumber}`, { waitUntil: 'networkidle' });
		await page.getByRole('tab', { name: 'Kitchen' }).click();
		await panel().locator('textarea').fill('No nuts');
		await panel().getByRole('button', { name: 'Save' }).click();
		await page.getByText('Kitchen notes saved').waitFor({ timeout: 10_000 });
		await panel().locator('textarea').fill('No nuts or shellfish');
		await panel().getByRole('button', { name: 'Save' }).click();
		await expect
			.poll(async () => (await confirmation(stay)).diet_notes, { timeout: 10_000 })
			.toBe('No nuts or shellfish');
		const db = await staffClient();
		const records = unwrap(
			await db.from('kitchen_meals').select('kitchenmealid').eq('guestid', stay.guestid).eq('kmarchive', false)
		) as unknown[];
		expect(records).toHaveLength(1);
	});
});
