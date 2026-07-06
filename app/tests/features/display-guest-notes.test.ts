// Story: spec/features/display-guest-notes.feature
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { rpc, uid } from '../helpers/db';

let guestid: number;
let note: string;
let page: Page;

beforeAll(async () => {
	note = `Office note ${uid()}`;
	guestid = await rpc<number>('create_guest', { p_lastname: `ZZNotes-${uid()}`, p_notes: note });
	page = await openAppPage();
});

afterAll(async () => {
	await closeApp(page);
});

describe('display guest notes', () => {
	it('shows the guest notes from the guest screen', async () => {
		await page.goto(`${APP_URL}/guests/${guestid}`, { waitUntil: 'networkidle' });
		await page.click('button:has-text("Guest notes")');
		await page.waitForSelector('div[role=dialog] textarea');
		expect(await page.inputValue('div[role=dialog] textarea')).toContain(note);
	});

	it('lets staff edit and save the notes', async () => {
		const updated = `${note} — updated`;
		await page.fill('div[role=dialog] textarea', updated);
		await page.click('button:has-text("Save notes")');
		await page.waitForSelector('text=Guest notes saved', { timeout: 10_000 });
		await page.goto(`${APP_URL}/guests/${guestid}`, { waitUntil: 'networkidle' });
		await page.click('button:has-text("Guest notes")');
		await page.waitForSelector('div[role=dialog] textarea');
		expect(await page.inputValue('div[role=dialog] textarea')).toBe(updated);
	});

	it('labels the notes as office-only', async () => {
		const dialog = await page.textContent('div[role=dialog]');
		expect(dialog).toMatch(/office only/i);
	});
});
