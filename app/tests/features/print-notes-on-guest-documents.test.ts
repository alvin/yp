// Story: spec/features/print-notes-on-guest-documents.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import {
	addDays,
	firstOccupancyId,
	makeReservation,
	roomDirectory,
	roomWindows,
	rpc,
	uid,
	type Fixture
} from '../helpers/db';

interface DocumentNotes {
	diet_notes: string | null;
	housekeeping_notes: string | null;
	request_notes: string | null;
	occupancy_notes: string | null;
}

async function confirmation(fx: Fixture): Promise<DocumentNotes> {
	return (
		await rpc<DocumentNotes[]>('report_reservation_confirmation', { p_reservationid: fx.reservationid })
	)[0];
}

async function folio(fx: Fixture): Promise<DocumentNotes> {
	return (await rpc<DocumentNotes[]>('report_check_in_folio', { p_reservationid: fx.reservationid }))[0];
}

async function notice(fx: Fixture): Promise<DocumentNotes> {
	return (
		await rpc<DocumentNotes[]>('report_cancellation_notice', { p_reservationid: fx.reservationid })
	)[0];
}

function setOccupancyNotes(occupancyid: number, notes: string) {
	return rpc('set_occupancy_notes', { p_occupancyid: occupancyid, p_notes: notes });
}

let full: Fixture; // every note, the housekeeping note revised once
let plain: Fixture; // none
let earlier: string;
let latest: string;
const request = `Massage Sunday ${uid()}`;
const message = `Please let us know who joins you ${uid()}`;

beforeAll(async () => {
	full = await makeReservation();
	await rpc('save_kitchen_meal', { p_guestid: full.guestid, p_guestdiet: 'Vegan', p_notes: '1 vegan' });
	earlier = `twin beds ${uid()}`;
	latest = `split beds ${uid()}`;
	for (const [notes, days] of [
		[earlier, -20],
		[latest, -10]
	] as const)
		await rpc('add_housekeeping_note', {
			p_reservationguestid: full.reservationguestid,
			p_notes: notes,
			p_date: addDays(full.arrival, days)
		});
	await rpc('update_reservation_guest', {
		p_reservationguestid: full.reservationguestid,
		p_rgnotes: request
	});
	await setOccupancyNotes(await firstOccupancyId(full), message);

	plain = await makeReservation();
});

describe('print notes on guest documents', () => {
	it("prints the diet on the confirmation in the kitchen report's wording", async () => {
		const kitchen = await rpc<{ resnumber: number; diet_notes: string }[]>('report_kitchen_meal', {
			p_date: full.arrival
		});
		const kitchenDiet = kitchen.find((k) => k.resnumber === full.resnumber)!.diet_notes;
		expect(kitchenDiet).toBe('Vegan 1 vegan');
		expect((await confirmation(full)).diet_notes).toBe(kitchenDiet);
	});

	it('prints only the latest housekeeping note, as the housekeeping report does', async () => {
		const housekeeping = await rpc<{ resnumber: number; notes: string | null }[]>(
			'report_housekeeping',
			{ p_date: full.arrival }
		);
		expect(housekeeping.find((h) => h.resnumber === full.resnumber)!.notes).toBe(latest);
		expect((await confirmation(full)).housekeeping_notes).toBe(latest);
	});

	it('prints the requests and the occupancy notes on the confirmation', async () => {
		expect(await confirmation(full)).toMatchObject({
			request_notes: request,
			occupancy_notes: message
		});
	});

	it('prints the same diet and housekeeping note on the check-in folio', async () => {
		expect(await folio(full)).toMatchObject({ diet_notes: 'Vegan 1 vegan', housekeeping_notes: latest });
	});

	it('prints no notes for a stay with none', async () => {
		expect(await confirmation(plain)).toMatchObject({
			diet_notes: null,
			housekeeping_notes: null,
			request_notes: null,
			occupancy_notes: null
		});
		expect(await folio(plain)).toMatchObject({ diet_notes: null, housekeeping_notes: null });
	});

	it('prints each different occupancy note of a stay once, in room order', async () => {
		const stay = await makeReservation();
		const [, second, third] = await roomDirectory();
		for (const room of [second, third])
			await rpc('assign_room', {
				p_reservationguestid: stay.reservationguestid,
				p_roomid: room.roomid,
				p_occupancyin: stay.arrival,
				p_occupancyout: stay.departure
			});
		const rooms = await roomWindows(stay);
		expect(rooms).toHaveLength(3);
		await setOccupancyNotes(rooms[0].occupancyid, 'one bill');
		await setOccupancyNotes(rooms[1].occupancyid, 'joining Leslie');
		await setOccupancyNotes(rooms[2].occupancyid, 'one bill');
		expect((await confirmation(stay)).occupancy_notes).toBe('one bill\njoining Leslie');
	});

	it('prints the occupancy notes on the cancellation notice, with the note typed when cancelling', async () => {
		const stay = await makeReservation();
		await setOccupancyNotes(await firstOccupancyId(stay), 'ONE YEAR ONLY');
		await rpc('cancel_reservation', {
			p_reservationid: stay.reservationid,
			p_date: stay.arrival,
			p_deposit_handling: 'none',
			p_notes: 'Cancelled by phone'
		});
		expect((await notice(stay)).occupancy_notes).toBe('ONE YEAR ONLY\nCancelled by phone');
	});
});

describe('print notes on guest documents — on paper', () => {
	const page = useAppPage();

	async function sheet(path: string): Promise<string> {
		await page.goto(`${APP_URL}${path}`, { waitUntil: 'networkidle' });
		return (await page.textContent('.report-page')) ?? '';
	}

	it('prints every note on the confirmation', async () => {
		const text = await sheet(`/reports/confirmation/${full.resnumber}`);
		for (const s of ['Diet:', '1 vegan', 'Housekeeping:', latest, 'Requests:', request, message])
			expect(text).toContain(s);
	});

	it('prints the diet and housekeeping note on the check-in folio', async () => {
		const text = await sheet(`/reports/check-in-folio/${full.resnumber}`);
		for (const s of ['Diet:', '1 vegan', 'Housekeeping:', latest]) expect(text).toContain(s);
	});

	it('prints no note lines for a stay without them', async () => {
		for (const doc of ['confirmation', 'check-in-folio']) {
			const text = await sheet(`/reports/${doc}/${plain.resnumber}`);
			for (const s of ['Diet:', 'Housekeeping:', 'Requests:']) expect(text).not.toContain(s);
		}
	});

	it('prints the occupancy notes on the cancellation notice', async () => {
		const stay = await makeReservation();
		await setOccupancyNotes(await firstOccupancyId(stay), message);
		await rpc('cancel_reservation', {
			p_reservationid: stay.reservationid,
			p_date: stay.arrival,
			p_deposit_handling: 'none'
		});
		expect(await sheet(`/reports/cancellation/${stay.resnumber}`)).toContain(message);
	});
});
