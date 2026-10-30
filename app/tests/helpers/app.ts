// Browser-side test helpers. One Chromium instance per worker process, one
// signed-in page per test file (or per describe block that asks for its own).

import { afterAll, beforeAll } from 'vitest';
import { chromium, type Browser, type Locator, type Page } from 'playwright';
import { ADMIN_EMAIL, ADMIN_PASSWORD, APP_URL, STAFF_EMAIL, STAFF_PASSWORD } from './env';

let browser: Browser | null = null;
let refs = 0;

export type Login = 'staff' | 'admin';

const LOGINS: Record<Login, { email: string; password: string; home: string }> = {
	staff: { email: STAFF_EMAIL, password: STAFF_PASSWORD, home: '/' },
	admin: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, home: '/admin/sales' }
};

/** A page signed in as front-desk staff, or as the admin login. */
export async function openAppPage(login: Login = 'staff'): Promise<Page> {
	if (!browser) browser = await chromium.launch();
	refs += 1;
	const { email, password, home } = LOGINS[login];
	const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
	const page = await context.newPage();
	await page.goto(APP_URL + '/login', { waitUntil: 'networkidle' });
	await page.fill('#email', email);
	await page.fill('#password', password);
	await page.click('button[type=submit]');
	await page.waitForURL(new RegExp(`^${APP_URL}${home}(\\?.*)?$`), { timeout: 20_000 });
	return page;
}

/** A page that is NOT signed in (fresh context, no session). */
export async function openAnonymousPage(): Promise<Page> {
	if (!browser) browser = await chromium.launch();
	refs += 1;
	const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
	return context.newPage();
}

export async function closeApp(page?: Page): Promise<void> {
	if (page) await page.context().close();
	refs = Math.max(0, refs - 1);
	if (refs === 0 && browser) {
		await browser.close();
		browser = null;
	}
}

/**
 * A signed-in page for the enclosing file or describe block: opened in a
 * beforeAll registered here (so before any registered after the call) and
 * closed in an afterAll. Pass `path` to land on a screen once it is open, and
 * `'admin'` to sign in as the admin login.
 *
 * Returns the page itself, usable in any hook or test that runs after it
 * opens; touching it earlier (at module load) throws.
 */
export function useAppPage(path?: string, login: Login = 'staff'): Page {
	let page: Page | undefined;
	beforeAll(async () => {
		page = await openAppPage(login);
		if (path) await page.goto(APP_URL + path, { waitUntil: 'networkidle' });
	});
	afterAll(async () => {
		await closeApp(page);
	});
	return new Proxy({} as Page, {
		get(_, prop) {
			// Not a thenable, whatever state it is in.
			if (prop === 'then') return undefined;
			if (!page) throw new Error('useAppPage(): the page is not open yet');
			const value = Reflect.get(page, prop, page);
			return typeof value === 'function' ? value.bind(page) : value;
		}
	});
}

/** The value of a labelled field on the reservation screen (its <dd>). */
export function field(page: Page, label: string): Locator {
	return page.locator('dt', { hasText: new RegExp(`^${label}$`) }).locator('xpath=../dd');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A date as printed documents show it: 05-Mar-26. */
export function printedDate(iso: string): string {
	const [y, m, d] = iso.slice(0, 10).split('-');
	return `${d}-${MONTHS[Number(m) - 1]}-${y.slice(-2)}`;
}

/** A date in the lines of the daily sheets, without the year: 05-Mar. */
export function printedDay(iso: string): string {
	return printedDate(iso).slice(0, 6);
}

/** A date as the screens show it: Mar 5, 2026. */
export function screenDate(iso: string): string {
	const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
	return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export { APP_URL };
