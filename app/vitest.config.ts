import { defineConfig } from 'vitest/config';

// Feature test suite: one test file per spec/features/*.feature, exercising the
// real local Supabase stack (database business logic) and the running app
// (browser flows). See tests/README.md.
export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		globalSetup: ['tests/global-setup.ts'],
		pool: 'forks',
		// isolate:false keeps one process per worker across test files so the
		// date/name allocators in tests/helpers/db.ts stay unique per worker
		// (each worker owns a disjoint historical date block) and the Playwright
		// browser is reused instead of relaunched per file.
		poolOptions: { forks: { minForks: 1, maxForks: 4, isolate: false } },
		testTimeout: 60_000,
		hookTimeout: 120_000,
		sequence: { hooks: 'list' }
	}
});
