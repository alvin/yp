// Story: spec/features/import-the-legacy-access-database-losslessly.feature
//
// The full import runs against the lodge's production .accdb in the migration
// environment (see supabase/README.md). These tests hold the database the app
// runs on to what that import promises, and pin the parts of the import
// tooling that keep its promises.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeReservation, pay, postCharge, staffClient, uid, unwrap } from '../helpers/db';

const root = join(__dirname, '..', '..', '..');
const tools = join(root, 'supabase', 'tools');
const generated = join(root, 'supabase', 'legacy_import', 'all_legacy_data.sql');

/** Runs Python against the import tooling and returns what it prints. */
function python(code: string): string {
	return execFileSync('python3', ['-I', '-c', `import sys; sys.path.insert(0, ${JSON.stringify(tools)})\n${code}`], {
		encoding: 'utf8'
	}).trim();
}

async function highest(table: string, column: string): Promise<number> {
	const db = await staffClient();
	const [row] = unwrap(
		await db.from(table).select(column).order(column, { ascending: false }).limit(1)
	) as unknown as Record<string, number>[];
	return row?.[column] ?? 0;
}

describe('import the legacy Access database losslessly', () => {
	it('gives every Access table a home in the new schema', async () => {
		const targets = JSON.parse(
			python('import json, access_table_map as m; print(json.dumps([t.postgres_name for t in m.TABLES]))')
		) as string[];
		expect(targets.length).toBeGreaterThan(40);
		const db = await staffClient();
		for (const table of targets) {
			const { error } = await db.from(table).select('*', { count: 'exact', head: true });
			expect(error?.message, table).toBeUndefined();
		}
	});

	it('loads values as stored, with the business-logic triggers off for the load', () => {
		const exporter = readFileSync(join(tools, 'export_access_data.py'), 'utf8');
		expect(exporter).toContain('session_replication_role = replica');
		expect(exporter).toContain('session_replication_role = default');
	});

	it('imports an Access zero date as empty rather than failing the load', () => {
		const rewritten = python(
			"import access_table_map as m; print(m.rewrite_export_sql(\"insert into t values ('2004-01-00 00:00:00', '2004-01-02 00:00:00');\"))"
		);
		expect(rewritten).toBe("insert into t values (NULL, '2004-01-02 00:00:00');");
	});

	it('continues every identity and the reservation number past the data on file', async () => {
		const before = {
			guests: await highest('guests', 'guestid'),
			reservations: await highest('reservations', 'reservationid'),
			resnumber: await highest('reservations', 'resnumber'),
			transactions: await highest('transactions', 'transactionid'),
			payments: await highest('payments', 'paymentid')
		};
		const fx = await makeReservation({ lastname: `ZZImport${uid()}` });
		const charge = await postCharge(fx, { amount: 5 });
		const payment = await pay(fx, 'Payment (Regular)', 5);
		expect(fx.guestid).toBeGreaterThan(before.guests);
		expect(fx.reservationid).toBeGreaterThan(before.reservations);
		expect(fx.resnumber).toBeGreaterThan(before.resnumber);
		expect(charge).toBeGreaterThan(before.transactions);
		expect(payment).toBeGreaterThan(before.payments);
	});

	it('keeps every stay, charge, payment and room tied to its guest and reservation', async () => {
		const db = await staffClient();
		for (const [table, parent, key] of [
			['reservation_guests', 'guests', 'guestid'],
			['reservation_guests', 'reservations', 'reservationid'],
			['transactions', 'reservation_guests', 'reservationguestid'],
			['payments', 'reservation_guests', 'reservationguestid'],
			['room_assignments', 'reservation_guests', 'reservationguestid']
		]) {
			const { count, error } = await db
				.from(table)
				.select(`${key}, ${parent}!left(${key})`, { count: 'exact', head: true })
				.is(parent, null);
			expect(error?.message, `${table} → ${parent}`).toBeUndefined();
			expect(count, `${table} rows with no ${parent} row`).toBe(0);
		}
	});

	it.skipIf(!existsSync(generated))('writes a load script that carries those safeguards', () => {
		const head = readFileSync(generated, 'utf8').slice(0, 4000);
		expect(head).toContain('session_replication_role = replica');
		expect(head).toContain('set constraints all deferred');
	});
});
