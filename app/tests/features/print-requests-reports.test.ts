// Story: spec/features/print-requests-reports.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { addDays, cancel, isolatedDate, makeReservation, rpc, uid, type Fixture } from '../helpers/db';

interface RequestRow {
	resnumber: number;
	guest: string;
	rooms: string;
	arrival_date: string;
	departure_date: string;
	request: string;
}

interface GuestRequestRow {
	resnumber: number;
	arrival_date: string;
	request: string;
}

function request(fx: Fixture, text: string) {
	return rpc('update_reservation_guest', {
		p_reservationguestid: fx.reservationguestid,
		p_rgnotes: text
	});
}

async function bookAgain(fx: Fixture, arrival: string): Promise<Fixture> {
	const [row] = await rpc<{ reservationid: number; resnumber: number; reservationguestid: number }[]>(
		'create_reservation',
		{
			p_guestid: fx.guestid,
			p_arrival: arrival,
			p_departure: addDays(arrival, 2),
			p_bookedby: 'QA',
			p_numadults: 2
		}
	);
	return { ...fx, ...row, arrival, departure: addDays(arrival, 2) };
}

const day = isolatedDate();
const tag = uid();
let arriving: Fixture;
let inHouse: Fixture;
let departing: Fixture;
let noRequest: Fixture;
let cancelled: Fixture;
let elsewhere: Fixture;

beforeAll(async () => {
	// Last names put the three that count in reverse order of booking.
	departing = await makeReservation({ lastname: `ZZReqA-${tag}`, arrival: addDays(day, -2), departure: day });
	inHouse = await makeReservation({ lastname: `ZZReqB-${tag}`, arrival: addDays(day, -1), departure: addDays(day, 1) });
	arriving = await makeReservation({ lastname: `ZZReqC-${tag}`, arrival: day });
	noRequest = await makeReservation({ lastname: `ZZReqD-${tag}`, arrival: day });
	cancelled = await makeReservation({ lastname: `ZZReqE-${tag}`, arrival: day });
	elsewhere = await makeReservation({ lastname: `ZZReqF-${tag}`, arrival: addDays(day, 1) });
	for (const fx of [departing, inHouse, arriving, cancelled, elsewhere]) await request(fx, `req ${fx.lastname}`);
	await cancel(cancelled);
});

describe('print requests reports — for a day', () => {
	it('lists every stay at the lodge that day with a request, by guest name', async () => {
		const rows = await rpc<RequestRow[]>('report_requests', { p_date: day });
		expect(rows.map((r) => r.resnumber)).toEqual([departing, inHouse, arriving].map((f) => f.resnumber));
		expect(rows[2]).toMatchObject({
			request: `req ${arriving.lastname}`,
			arrival_date: arriving.arrival,
			departure_date: arriving.departure
		});
		expect(rows[2].rooms).toBeTruthy();
	});

	it('leaves out a stay without a request, a cancelled stay and one not at the lodge that day', async () => {
		const rows = await rpc<RequestRow[]>('report_requests', { p_date: day });
		for (const fx of [noRequest, cancelled, elsewhere])
			expect(rows.some((r) => r.resnumber === fx.resnumber)).toBe(false);
	});
});

describe("print requests reports — a guest's requests", () => {
	let first: Fixture;
	let second: Fixture;
	let dropped: Fixture;

	beforeAll(async () => {
		second = await makeReservation({ arrival: isolatedDate() });
		first = await bookAgain(second, addDays(second.arrival, -365));
		dropped = await bookAgain(second, addDays(second.arrival, 365));
		await bookAgain(second, addDays(second.arrival, 730)); // no request
		await request(second, 'second stay');
		await request(first, 'first stay');
		await request(dropped, 'never happened');
		await cancel(dropped);
	});

	it('lists each stay with a request, oldest first, leaving out a cancelled one', async () => {
		const rows = await rpc<GuestRequestRow[]>('report_guest_requests', { p_guestid: second.guestid });
		expect(rows.map((r) => [r.resnumber, r.request])).toEqual([
			[first.resnumber, 'first stay'],
			[second.resnumber, 'second stay']
		]);
	});

	describe('on screen', () => {
		const page = useAppPage();

		it('opens from Requests beside Guest notes on the reservation screen', async () => {
			await page.goto(`${APP_URL}/reservations/${second.resnumber}`, { waitUntil: 'networkidle' });
			await page.getByRole('link', { name: 'Requests' }).click();
			await page.waitForURL(`**/reports/guest-requests/${second.guestid}?from=${second.resnumber}`);
			const sheet = (await page.textContent('.report-page')) ?? '';
			expect(sheet.indexOf('first stay')).toBeGreaterThan(-1);
			expect(sheet.indexOf('first stay')).toBeLessThan(sheet.indexOf('second stay'));
			expect(sheet).not.toContain('never happened');
		});

		it("opens from Requests beside Guest notes on the guest's page", async () => {
			await page.goto(`${APP_URL}/guests/${second.guestid}`, { waitUntil: 'networkidle' });
			await page.getByRole('link', { name: 'Requests' }).click();
			await page.waitForURL(`**/reports/guest-requests/${second.guestid}`);
			expect(await page.textContent('.report-page')).toContain('second stay');
		});

		// The Print Center's daily report links: print-daily-operations-reports.
		it('is among the daily report tabs', async () => {
			await page.goto(`${APP_URL}/reports/in-house?date=${day}`, { waitUntil: 'networkidle' });
			await page.getByRole('link', { name: 'Requests', exact: true }).click();
			await page.waitForURL(`**/reports/requests?date=${day}`);
			expect(await page.textContent('.report-page')).toContain(`req ${arriving.lastname}`);
		});
	});
});
