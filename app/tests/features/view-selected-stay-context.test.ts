// Story: spec/features/view-selected-stay-context.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, field, printedDate, screenDate, useAppPage } from '../helpers/app';
import { makeReservation, pay, postCharge, pricedItem, roomDirectory, type Fixture, type Item, type RoomRow } from '../helpers/db';

let fx: Fixture;
let room: RoomRow;
let item: Item;

const page = useAppPage();

beforeAll(async () => {
	room = (await roomDirectory())[0];
	item = await pricedItem();
	fx = await makeReservation({ nights: 4, firstname: 'Sky', roomid: room.roomid });
	await postCharge(fx, { inventoryid: item.inventoryid, amount: 12.5 });
	await pay(fx, 'Deposit (Received)', 75);
	await page.goto(`${APP_URL}/reservations/${fx.resnumber}`, { waitUntil: 'networkidle' });
});

describe('view selected stay context', () => {
	it('shows the reservation number and its guest', async () => {
		await expect.poll(() => page.textContent('h1')).toBe(`Reservation #${fx.resnumber}`);
		expect(await page.locator('[data-slot=card]', { hasText: 'Guest' }).first().textContent()).toContain(
			fx.lastname
		);
	});

	it('shows the stay’s dates, nights, party, beds and who booked it', async () => {
		expect(await field(page, 'Arrival').textContent()).toBe(screenDate(fx.arrival));
		expect(await field(page, 'Departure').textContent()).toBe(screenDate(fx.departure));
		expect(await field(page, 'Nights').textContent()).toBe('4');
		expect(await field(page, 'Guests').textContent()).toContain('2 adults');
		expect(await field(page, 'Beds').textContent()).toBe('Regular');
		expect(await field(page, 'Booked by').textContent()).toBe('QA');
	});

	it('shows the room the stay holds, with its dates and party', async () => {
		const card = page.locator('[data-slot=card]', { hasText: 'Rooms & moves' });
		const text = ((await card.textContent()) ?? '').replace(/\s+/g, ' ');
		expect(text).toContain(room.room_compact);
		expect(text).toContain(`${printedDate(fx.arrival)} → ${printedDate(fx.departure)} · 2 guests`);
	});

	it('shows its charge and payment lines', async () => {
		const rows = page.locator('table tbody tr');
		await expect.poll(() => rows.count(), { timeout: 10_000 }).toBe(2);
		expect(await rows.filter({ hasText: item.invcode }).textContent()).toContain('$12.50');
		expect(await rows.filter({ hasText: 'Deposit (Received)' }).textContent()).toContain('$75.00');
	});
});
