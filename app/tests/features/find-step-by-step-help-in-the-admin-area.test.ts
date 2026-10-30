// Story: spec/features/find-step-by-step-help-in-the-admin-area.feature

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_URL, useAppPage } from '../helpers/app';
import { HELP, type HelpPageKey } from '../../src/lib/admin-help';

const PAGES: [HelpPageKey, string][] = [
	['sales', '/admin/sales'],
	['itemPrices', '/admin/item-prices'],
	['rooms', '/admin/rooms'],
	['taxes', '/admin/taxes'],
	['yearEnd', '/admin/year-end-deposits']
];

// The screens the help describes, and the shared parts they are built from.
const src = join(__dirname, '..', '..', 'src');
function svelteFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return svelteFiles(path);
		return name.endsWith('.svelte') ? [path] : [];
	});
}
const SCREENS = [
	...svelteFiles(join(src, 'routes', 'admin')),
	...svelteFiles(join(src, 'lib', 'components', 'admin')),
	...['form-sheet', 'report-shell', 'report-date-input'].map((f) =>
		join(src, 'lib', 'components', 'app', `${f}.svelte`)
	),
	join(src, 'lib', 'components', 'ui', 'combobox', 'combobox.svelte')
]
	.map((f) => readFileSync(f, 'utf8'))
	.join('\n');

const named = (key: HelpPageKey) =>
	HELP[key].sections
		.flatMap((s) => [...(s.text ?? []), ...(s.steps ?? []), ...(s.after ?? [])])
		.flatMap((line) => [...line.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]));

describe('find step-by-step help in the admin area', () => {
	it('names only buttons, tabs and fields that exist on the admin screens', () => {
		for (const [key] of PAGES) {
			const names = [...new Set(named(key))];
			expect(names.length, key).toBeGreaterThan(0);
			for (const name of names) {
				const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				const shown = new RegExp(`(^|[\\s'"\`>{])${escaped}($|[\\s'"\`<}.,:…])`);
				expect(shown.test(SCREENS), `${key}: "${name}"`).toBe(true);
			}
		}
	});

	describe('on screen', () => {
		const page = useAppPage(undefined, 'admin');

		it('opens each page’s help beside it, its tasks step by step', async () => {
			for (const [key, path] of PAGES) {
				await page.goto(APP_URL + path, { waitUntil: 'networkidle' });
				await page.getByRole('button', { name: 'Help' }).click();
				const drawer = page.getByRole('dialog', { name: HELP[key].title });
				await drawer.waitFor();
				expect(await drawer.locator('section h3').allInnerTexts(), key).toEqual(
					HELP[key].sections.map((s) => s.title)
				);
				const steps = HELP[key].sections.flatMap((s) => s.steps ?? []).length;
				expect(await drawer.locator('section ol li').count(), key).toBe(steps);
				// A control's name is in bold, as the screen shows it.
				const first = named(key)[0];
				expect(await drawer.locator('strong', { hasText: first }).count(), key).toBeGreaterThan(0);
				await page.keyboard.press('Escape');
				await drawer.waitFor({ state: 'hidden' });
			}
		});

		it('lists a long page’s tasks first, each jumping to its steps', async () => {
			await page.goto(APP_URL + '/admin/rooms', { waitUntil: 'networkidle' });
			await page.getByRole('button', { name: 'Help' }).click();
			const drawer = page.getByRole('dialog', { name: HELP.rooms.title });
			const topics = drawer.getByRole('navigation', { name: 'Topics' });
			expect(await topics.getByRole('button').allInnerTexts()).toEqual(
				HELP.rooms.sections.map((s) => s.title)
			);
			const last = HELP.rooms.sections.at(-1)!.title;
			const heading = drawer.locator('section h3', { hasText: new RegExp(`^${last}$`) });
			const viewport = page.viewportSize()!;
			const below = await heading.boundingBox();
			expect(below!.y).toBeGreaterThan(viewport.height);
			await topics.getByRole('button', { name: last, exact: true }).click();
			await expect.poll(async () => (await heading.boundingBox())!.y).toBeLessThan(viewport.height);
			await page.keyboard.press('Escape');
		});
	});
});
