// Story: spec/features/show-a-guests-details.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { addDays, isolatedDate, rpc, uid } from '../helpers/db';

let guestid: number;
let lastname: string;
let resnumber: number;
const email = 'kim.details@example.test';

const page = useAppPage();
const card = () => page.locator('[data-slot=card]').first();

beforeAll(async () => {
	lastname = `ZZDetail${uid()}`;
	guestid = await rpc<number>('create_guest', {
		p_lastname: lastname,
		p_firstname: 'Kim',
		p_address: '4821 Test Harbour Road',
		p_city: 'Chemainus',
		p_region: 'BC',
		p_pczip: 'V9G 1E5',
		p_country: 'CAN',
		p_primaryphone: '(250) 555-0117',
		p_primaryphonetype: 'Cell',
		p_secondaryphone: '(250) 555-0199',
		p_secondaryphonetype: 'Work',
		p_email: email
	});
	const arrival = isolatedDate();
	const [stay] = await rpc<{ resnumber: number }[]>('create_reservation', {
		p_guestid: guestid,
		p_arrival: arrival,
		p_departure: addDays(arrival, 3),
		p_bookedby: 'QA'
	});
	resnumber = stay.resnumber;
});

describe("show a guest's details", () => {
	it("opens the guest's page from a name match on the lookup screen", async () => {
		await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
		await page.getByRole('tab', { name: 'Name', exact: true }).click();
		await page.fill('#name-q', lastname.slice(0, 12));
		await page.locator('[data-testid=guest-matches] button', { hasText: lastname }).first().click();
		await page.waitForURL(`${APP_URL}/guests/${guestid}`, { timeout: 15_000 });
	});

	it('shows the name and guest number once, beside the reservation history', async () => {
		await expect.poll(() => card().textContent(), { timeout: 10_000 }).toContain(`${lastname}, Kim`);
		const body = (await page.textContent('body')) ?? '';
		expect(body.split(`Guest #${guestid}`)).toHaveLength(2);
		expect(await page.locator('h2').allTextContents()).toEqual([
			'Present reservation (in house)',
			'Future reservations',
			'Past reservations'
		]);
	});

	it('shows the address, then city, province and postal code, then the country', async () => {
		const address = card().locator('span', { hasText: '4821 Test Harbour Road' }).first();
		expect((await address.innerText()).split('\n').map((l) => l.trim())).toEqual([
			'4821 Test Harbour Road',
			'Chemainus, BC, V9G 1E5',
			'CAN'
		]);
	});

	it('shows each phone with its type, and the email as a link that writes to it', async () => {
		const text = await card().innerText();
		expect(text).toMatch(/\(250\) 555-0117\s*·\s*Cell/);
		expect(text).toMatch(/\(250\) 555-0199\s*·\s*Work/);
		expect(await card().locator(`a[href="mailto:${email}"]`).textContent()).toBe(email);
	});

	it('leaves no line for a phone or email not on file', async () => {
		const bare = await rpc<number>('create_guest', {
			p_lastname: `ZZBare${uid()}`,
			p_city: 'Ladysmith'
		});
		await page.goto(`${APP_URL}/guests/${bare}`, { waitUntil: 'networkidle' });
		await expect.poll(() => card().textContent(), { timeout: 10_000 }).toContain(`Guest #${bare}`);
		expect(await card().locator('.lucide-phone').count()).toBe(0);
		expect(await card().locator('a[href^="mailto:"]').count()).toBe(0);
	});

	it('opens a reservation from the history', async () => {
		await page.goto(`${APP_URL}/guests/${guestid}`, { waitUntil: 'networkidle' });
		await page.click(`a[href="/reservations/${resnumber}"]`);
		await page.waitForURL(`${APP_URL}/reservations/${resnumber}`, { timeout: 15_000 });
		await expect.poll(() => page.textContent('h1')).toContain(`Reservation #${resnumber}`);
	});
});
