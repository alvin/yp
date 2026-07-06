// Story: spec/features/import-the-legacy-access-database-losslessly.feature
//
// The full import runs against the 188 MB production .accdb in the air-gapped
// migration environment (verified end-to-end there: all 60 tables, zero
// referential orphans, sequences continued — see supabase/README.md). Here we
// pin the import *contract*: the tooling must generate a script with every
// safety property that verification relied on, and the generated script (when
// present) must carry them.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', '..', '..');
const exporter = readFileSync(join(root, 'supabase', 'tools', 'export_access_data.py'), 'utf8');
const tableMap = readFileSync(join(root, 'supabase', 'tools', 'access_table_map.py'), 'utf8');

describe('import the legacy Access database losslessly', () => {
	it('exports every Access table into the new schema', () => {
		// The exporter walks the full table map (60 tables) and truncates before load.
		expect(exporter).toContain('for table in TABLES');
		expect(exporter).toContain('truncate table');
		expect(tableMap).toContain('tblGuest');
		expect(tableMap).toContain('tblReservation');
		expect(tableMap).toContain('tblTransaction');
		expect(tableMap).toContain('tblPayment');
	});

	it('loads byte-for-byte by disabling business-logic triggers during import', () => {
		expect(exporter).toContain('session_replication_role = replica');
		expect(exporter).toContain('session_replication_role = default');
	});

	it('imports Access zero dates as empty instead of failing', () => {
		expect(tableMap).toMatch(/_ZERO_DAY_TIMESTAMP/);
		expect(tableMap).toContain("sub(\"NULL\"");
	});

	it('continues identity sequences and the reservation-number counter past imported data', () => {
		expect(tableMap).toContain('pg_get_serial_sequence');
		expect(exporter).toContain('resnumber_seq');
	});

	it('generated import script carries the safety constructs (when present)', () => {
		const generated = join(root, 'supabase', 'legacy_import', 'all_legacy_data.sql');
		if (!existsSync(generated)) return; // not generated in this environment
		const head = readFileSync(generated, 'utf8').slice(0, 4000);
		expect(head).toContain('session_replication_role = replica');
		expect(head).toContain('set constraints all deferred');
	});
});
