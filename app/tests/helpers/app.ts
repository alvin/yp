// Browser-side test helpers. One Chromium instance per worker process, one
// signed-in page per test file. Close with closeApp() in afterAll.

import { chromium, type Browser, type Page } from 'playwright';
import { APP_URL, STAFF_EMAIL, STAFF_PASSWORD } from './env';

let browser: Browser | null = null;
let refs = 0;

export async function openAppPage(): Promise<Page> {
	if (!browser) browser = await chromium.launch();
	refs += 1;
	const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
	const page = await context.newPage();
	await page.goto(APP_URL + '/', { waitUntil: 'networkidle' });
	if (page.url().includes('/login')) {
		await page.fill('#email', STAFF_EMAIL);
		await page.fill('#password', STAFF_PASSWORD);
		await page.click('button[type=submit]');
		await page.waitForURL(APP_URL + '/', { timeout: 20_000 });
	}
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

export { APP_URL };
