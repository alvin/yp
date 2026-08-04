// Meta-test: every DONE story in spec/features has exactly one matching test
// file. This is what keeps the suite 1:1 with the living spec — marking a story
// done without a test (or leaving a test for a story that is not built) fails
// the build. Stories still in backlog/planned are deliberately untested.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const specDir = join(__dirname, '..', '..', 'spec', 'features');
const testsDir = join(__dirname, 'features');

const stories = readdirSync(specDir)
	.filter((f) => f.endsWith('.feature'))
	.map((f) => ({
		name: f.replace(/\.feature$/, ''),
		done: /@status:done\b/.test(readFileSync(join(specDir, f), 'utf8'))
	}))
	.sort((a, b) => a.name.localeCompare(b.name));

const done = stories.filter((s) => s.done).map((s) => s.name);
const notBuilt = stories.filter((s) => !s.done).map((s) => s.name);

const tests = readdirSync(testsDir)
	.filter((f) => f.endsWith('.test.ts'))
	.map((f) => f.replace(/\.test\.ts$/, ''))
	.sort();

describe('spec ↔ test coverage map', () => {
	it('has a test file for every story marked done', () => {
		const missing = done.filter((f) => !tests.includes(f));
		expect(missing, `done stories without a test file:\n${missing.join('\n')}`).toEqual([]);
	});

	it('has no test file without a matching feature story', () => {
		const orphaned = tests.filter((t) => !done.includes(t) && !notBuilt.includes(t));
		expect(orphaned, `test files without a feature:\n${orphaned.join('\n')}`).toEqual([]);
	});

	it('has no test file for a story that is not built', () => {
		const premature = tests.filter((t) => notBuilt.includes(t));
		expect(
			premature,
			`tests exist for stories not marked done:\n${premature.join('\n')}`
		).toEqual([]);
	});
});
