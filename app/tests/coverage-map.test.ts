// Meta-test: every story in spec/features has exactly one matching test file.
// This is what keeps the suite 1:1 with the living spec — adding a feature
// without a test (or a test without a feature) fails the build.

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const specDir = join(__dirname, '..', '..', 'spec', 'features');
const testsDir = join(__dirname, 'features');

const features = readdirSync(specDir)
	.filter((f) => f.endsWith('.feature'))
	.map((f) => f.replace(/\.feature$/, ''))
	.sort();

const tests = readdirSync(testsDir)
	.filter((f) => f.endsWith('.test.ts'))
	.map((f) => f.replace(/\.test\.ts$/, ''))
	.sort();

describe('spec ↔ test coverage map', () => {
	it('has a test file for every feature story', () => {
		const missing = features.filter((f) => !tests.includes(f));
		expect(missing, `features without a test file:\n${missing.join('\n')}`).toEqual([]);
	});

	it('has no test file without a matching feature story', () => {
		const orphaned = tests.filter((t) => !features.includes(t));
		expect(orphaned, `test files without a feature:\n${orphaned.join('\n')}`).toEqual([]);
	});
});
