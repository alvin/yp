// Story: spec/features/re-book-a-stay-for-next-year.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import {
	addDays,
	firstRoomId,
	makeReservation,
	rpc,
	staffClient,
	todayISO,
	uid,
	unwrap,
	type Fixture
} from '../helpers/db';

const DIET = 'Vegetarian';
const DIET_NOTES = 'No mushrooms';
const DEPOSIT = 120;
/** The lodge's season repeats on the weekday, not the calendar date. */
const SEASON = 364;

let page: Page;
/** The departing stay, dated so "next season" is bookable from today. */
let fx: Fixture;
let roomid: number;

async function reservationIdOf(n: number): Promise<number> {
	return (await rpc<{ reservationid: number }[]>('find_reservation', { p_resnumber: n }))[0]
		.reservationid;
}

async function openRebook(): Promise<void> {
	await page.goto(APP_URL + `/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
	await page.getByRole('link', { name: 'Re-book', exact: true }).click();
	await page.waitForURL(/\/reservations\/new\?from=\d+$/, { timeout: 20_000 });
	await page.locator('#arr').waitFor({ timeout: 10_000 });
}

beforeAll(async () => {
	roomid = await firstRoomId();
	// A guest leaving today — the case the front desk re-books from.
	fx = await makeReservation({
		lastname: `ZZRebook${uid()}`,
		firstname: 'Annie',
		arrival: addDays(todayISO(), -3),
		departure: todayISO(),
		roomid
	});
	await rpc('save_kitchen_meal', {
		p_guestid: fx.guestid,
		p_guestdiet: DIET,
		p_notes: DIET_NOTES
	});
	await rpc('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: 'Deposit (Received)',
		p_paymenttype: 'Visa',
		p_amount: DEPOSIT,
		p_paymentdate: fx.arrival
	});
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('re-book a stay for next year', () => {
	it('opens a new reservation carrying the name, contact details and diet', async () => {
		await openRebook();
		expect(await page.inputValue('#ln')).toBe(fx.lastname);
		expect(await page.inputValue('#fn')).toBe('Annie');
		expect(await page.inputValue('#ci')).toBe('Ladysmith');
		// The same guest record, not a second copy of the same person.
		expect(await page.locator('[data-testid=attached-guest]').textContent()).toContain(
			`#${fx.guestid}`
		);
		expect(await page.locator('#diet').textContent()).toContain(DIET);
		expect(await page.inputValue('#kitchen-notes')).toBe(DIET_NOTES);
	});

	it('offers the same stay next season, with the room and party it came from', async () => {
		expect(await page.inputValue('#arr')).toBe(addDays(fx.arrival, SEASON));
		expect(await page.inputValue('#dep')).toBe(addDays(fx.departure, SEASON));
		expect(await page.inputValue('#ad2')).toBe('2');

		const rooms = await rpc<{ roomid: number; room_compact: string }[]>('room_directory');
		const room = rooms.find((r) => r.roomid === roomid)!;
		expect(await page.locator('#room').textContent()).toContain(room.room_compact);
	});

	it('lets the dates and room be changed before saving', async () => {
		// The clerk moves the stay a week later and takes next year's deposit.
		await page.fill('#arr', addDays(fx.arrival, SEASON + 7));
		await page.fill('#dep', addDays(fx.departure, SEASON + 7));
		await page.fill('#bb', 'QA');
		await page.click('#basket-add-payment');
		await page.fill('#basket-amount', String(DEPOSIT));
		await page.getByRole('button', { name: /^Add Deposit/ }).click();
		await expect
			.poll(() => page.locator('[data-testid=basket-lines] li').count(), { timeout: 10_000 })
			.toBe(1);

		await page.getByRole('button', { name: 'Save reservation' }).click();
		await page.waitForURL(/\/reservations\/\d+$/, { timeout: 30_000 });
		const next = Number(page.url().split('/').pop());
		expect(next).not.toBe(fx.resnumber);

		const client = await staffClient();
		const [saved] = unwrap(
			await client
				.from('reservations')
				.select('resarrivaldate, resdeparturedate, resnotes')
				.eq('reservationid', await reservationIdOf(next))
		) as { resarrivaldate: string; resdeparturedate: string; resnotes: string | null }[];
		expect(saved.resarrivaldate.slice(0, 10)).toBe(addDays(fx.arrival, SEASON + 7));
		expect(saved.resdeparturedate.slice(0, 10)).toBe(addDays(fx.departure, SEASON + 7));
		// Saving records which reservation the stay was re-booked from.
		expect(saved.resnotes).toContain(String(fx.resnumber));
	});

	it('leaves the reservation it was re-booked from exactly as it stands', async () => {
		const client = await staffClient();
		const [original] = unwrap(
			await client
				.from('reservations')
				.select('rescancelled, resdatecancelled, resarrivaldate, resdeparturedate')
				.eq('reservationid', fx.reservationid)
		) as {
			rescancelled: boolean;
			resdatecancelled: string | null;
			resarrivaldate: string;
			resdeparturedate: string;
		}[];
		expect(original.rescancelled).toBe(false);
		expect(original.resdatecancelled).toBeNull();
		expect(original.resarrivaldate.slice(0, 10)).toBe(fx.arrival);
		expect(original.resdeparturedate.slice(0, 10)).toBe(fx.departure);

		// Its deposit stayed with it — the stay the guest actually took.
		expect(
			Number(
				await rpc('reservationguest_deposit_held', {
					p_reservationguestid: fx.reservationguestid
				})
			)
		).toBe(DEPOSIT);
	});

	it('records the deposit taken for next year against the new reservation', async () => {
		const next = Number(page.url().split('/').pop());
		const lines = await rpc<{ line_type: string; amount: number }[]>('reservation_ledger', {
			p_reservationid: await reservationIdOf(next)
		});
		const deposits = lines.filter((l) => l.line_type === 'Deposit (Received)');
		expect(deposits.map((d) => Number(d.amount))).toEqual([DEPOSIT]);
	});

	it('revises the diet on file rather than filing it a second time', async () => {
		const client = await staffClient();
		const meals = unwrap(
			await client
				.from('kitchen_meals')
				.select('kitchenmealid')
				.eq('guestid', fx.guestid)
				.eq('kmarchive', false)
		) as { kitchenmealid: number }[];
		expect(meals).toHaveLength(1);
	});
});
