// Story: spec/features/match-a-phone-number-in-any-format.feature

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { APP_URL, closeApp, openAppPage } from '../helpers/app';
import { formatPhone } from '../../src/lib/phone';
import { rpc, staffClient, uid, unwrap } from '../helpers/db';

interface AllFieldsRow {
	guestid: number;
	resnumber: number | null;
	matched_on: string;
	detail: string;
}

function search(query: string): Promise<AllFieldsRow[]> {
	return rpc<AllFieldsRow[]>('search_all_fields', { p_query: query });
}

// Two guests carrying the same number, each stored the way a different clerk
// happened to type it.
const PUNCTUATED = '(250) 555-0731';
const PLAIN = '2505550732';

let punctuatedId: number;
let plainId: number;
let addressOnlyId: number;

beforeAll(async () => {
	const u = uid();
	punctuatedId = await rpc<number>('create_guest', {
		p_lastname: `ZZPunct${u}`,
		p_primaryphone: PUNCTUATED
	});
	plainId = await rpc<number>('create_guest', {
		p_lastname: `ZZPlain${u}`,
		p_primaryphone: PLAIN
	});
	// A short run of digits that is a street number, not a telephone number.
	addressOnlyId = await rpc<number>('create_guest', {
		p_lastname: `ZZStreet${u}`,
		p_address: `5550731 ZZLane${u}`,
		p_primaryphone: '(604) 555-0999'
	});
});

describe('match a phone number in any format', () => {
	it('finds a punctuated number from digits alone', async () => {
		const rows = await search('2505550731');
		expect(rows.map((r) => r.guestid)).toContain(punctuatedId);
	});

	it('finds an unpunctuated number from a punctuated entry', async () => {
		for (const typed of ['(250) 555-0732', '250-555-0732', '250.555.0732', '250 555 0732']) {
			const rows = await search(typed);
			expect(rows.map((r) => r.guestid), typed).toContain(plainId);
		}
	});

	it('reads a number broken by spaces as one number, not as several keywords', async () => {
		// Each half on its own would have to match, and "(250)" does not appear
		// anywhere in a record storing "2505550732".
		const rows = await search('(250) 555-0732');
		const hit = rows.find((r) => r.guestid === plainId)!;
		expect(hit.matched_on).toContain('primary phone');
		expect(hit.detail).toContain(PLAIN);
	});

	it('does not treat a short run of digits as a telephone number', async () => {
		// Six digits: a street number or a reservation number, not a phone.
		const rows = await search('555073');
		expect(rows.map((r) => r.guestid)).not.toContain(punctuatedId);
		// It still matches where those characters really appear.
		expect((await search('5550731')).map((r) => r.guestid)).toContain(addressOnlyId);
	});
});

describe('match a phone number in any format — entering one', () => {
	it('writes a number typed any way back in the lodge\u2019s format', () => {
		for (const typed of ['2505926029', '250.592.6029', '250-592-6029', '(250) 592-6029']) {
			expect(formatPhone(typed), typed).toBe('(250) 592-6029');
		}
		expect(formatPhone('5926029')).toBe('592-6029');
		expect(formatPhone('12505926029')).toBe('1 (250) 592-6029');
	});

	it('keeps a number the format does not cover exactly as typed', () => {
		for (const typed of [
			'+44 20 7946 0958',
			'250 592 6029 ext 12',
			'(250) 592-6029 cell',
			'see guest notes'
		]) {
			expect(formatPhone(typed), typed).toBe(typed);
		}
		expect(formatPhone('')).toBe('');
		expect(formatPhone(null)).toBe('');
	});

	describe('on the new-reservation screen', () => {
		let page: Page;

		beforeAll(async () => {
			page = await openAppPage();
			await page.goto(`${APP_URL}/reservations/new`, { waitUntil: 'networkidle' });
		});

		afterAll(async () => {
			await closeApp(page);
		});

		it('formats the number when the clerk leaves the field', async () => {
			await page.fill('#ph', '2505926029');
			await page.locator('#em').focus();
			expect(await page.inputValue('#ph')).toBe('(250) 592-6029');
		});

		it('leaves a number it does not recognise alone', async () => {
			await page.fill('#ph', '+44 20 7946 0958');
			await page.locator('#em').focus();
			expect(await page.inputValue('#ph')).toBe('+44 20 7946 0958');
		});
	});

	it('leaves numbers already on file as they are', async () => {
		// Stored unpunctuated on purpose: reading a record must not rewrite it,
		// and the search finds it either way.
		const stored = '2505550777';
		const guestid = await rpc<number>('create_guest', {
			p_lastname: `ZZOnFile${uid()}`,
			p_primaryphone: stored
		});
		const client = await staffClient();
		const rows = unwrap(
			await client.from('guests').select('guestprimaryphone').eq('guestid', guestid)
		) as { guestprimaryphone: string }[];
		expect(rows[0].guestprimaryphone).toBe(stored);
		expect((await search('(250) 555-0777')).map((r) => r.guestid)).toContain(guestid);
	});
});
