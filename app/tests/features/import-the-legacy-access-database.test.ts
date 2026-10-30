// Story: spec/features/import-the-legacy-access-database.feature
//
// The full import runs against the lodge's production .accdb in the migration
// environment (see supabase/README.md). These tests hold the database the app
// runs on to what that import promises, and pin the parts of the import
// tooling that keep its promises.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeReservation, pay, postCharge, staffClient, uid, unwrap } from '../helpers/db';
import { SERVICE_ROLE_KEY, SUPABASE_URL } from '../helpers/env';

const root = join(__dirname, '..', '..', '..');
const tools = join(root, 'supabase', 'tools');
const generated = join(root, 'supabase', 'legacy_import', 'all_legacy_data.sql');
const seed = readFileSync(join(root, 'supabase', 'seed.sql'), 'utf8');

/** Runs Python against the import tooling and returns what it prints. */
function python(code: string): string {
	return execFileSync('python3', ['-I', '-c', `import sys; sys.path.insert(0, ${JSON.stringify(tools)})\n${code}`], {
		encoding: 'utf8'
	}).trim();
}

/** The tooling's lists: the tables loaded and seeded, by their names here. */
const map = JSON.parse(
	python(
		'import json, access_table_map as m; print(json.dumps({' +
			'"tables": [t.postgres_name for t in m.TABLES], ' +
			'"seed": [m.postgres_table_for_access(t) for t in m.SEED_ACCESS_TABLES]}))'
	)
) as { tables: string[]; seed: string[] };

// The records of guests and their stays, which only the full import carries.
const GUEST_RECORDS = [
	'guests',
	'reservations',
	'reservation_guests',
	'room_assignments',
	'transactions',
	'payments',
	'housekeeping_notes',
	'kitchen_meals'
];

/** Every table the API serves from ypl (its views are named v_…). */
async function schemaTables(): Promise<string[]> {
	const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
		headers: {
			apikey: SERVICE_ROLE_KEY,
			Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
			'Accept-Profile': 'ypl'
		}
	});
	const api = (await res.json()) as { definitions: Record<string, unknown> };
	return Object.keys(api.definitions)
		.filter((name) => !name.startsWith('v_'))
		.sort();
}

function files(dir: string, ext: RegExp): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return files(path, ext);
		return ext.test(name) ? [path] : [];
	});
}

async function highest(table: string, column: string): Promise<number> {
	const db = await staffClient();
	const [row] = unwrap(
		await db.from(table).select(column).order(column, { ascending: false }).limit(1)
	) as unknown as Record<string, number>[];
	return row?.[column] ?? 0;
}

describe('import the legacy Access database', () => {
	it('gives every Access table the system uses a table here, and no other Access table', async () => {
		expect(map.tables).toEqual(
			expect.arrayContaining([...GUEST_RECORDS, 'rooms', 'room_rates', 'inventory_items', 'tax_rates'])
		);
		expect(await schemaTables()).toEqual([...map.tables].sort());
	});

	it('leaves the rest in Access, and stops on an Access table it has no decision for', () => {
		const undecided = JSON.parse(
			python(
				'import json, access_table_map as m; ' +
					'print(json.dumps(m.undecided_tables(["tblGuest", "tblLookupUser", "tblSomethingNew"])))'
			)
		);
		expect(undecided).toEqual(['tblSomethingNew']);
		const both = python(
			'import access_table_map as m; print(set(t.access_name for t in m.TABLES) & set(m.LEFT_IN_ACCESS))'
		);
		expect(both).toBe('set()');
		expect(readFileSync(join(tools, 'export_access_data.py'), 'utf8')).toContain(
			'undecided_tables(access_tables(access_db))'
		);
	});

	it('seeds the setup the system uses and nothing else', () => {
		const seeded = [...seed.matchAll(/^INSERT INTO "ypl"\."([a-z0-9_]+)"/gim)].map((m) => m[1]).sort();
		expect(seeded).toEqual([...map.seed].sort());
		const setup = ['rooms', 'room_rates', 'inventory_items', 'tax_rates', 'exchange_rates', 'lookup_salutations'];
		for (const table of setup) expect(seeded, table).toContain(table);
		expect(seeded.filter((t) => GUEST_RECORDS.includes(t))).toEqual([]);
		expect(seeded.filter((t) => !map.tables.includes(t))).toEqual([]);
		// Nor Access's user list or its own settings, under any name.
		expect(seed).not.toMatch(/lookup_users|application_/);
	});

	it('loads and seeds only tables the system reads', () => {
		// Read: named by a screen, or by a view, function or rule. The migrations
		// that only create, secure or drop tables don't count.
		const code = [
			...files(join(root, 'app', 'src'), /\.(ts|svelte)$/),
			...files(join(root, 'supabase', 'migrations'), /\.sql$/).filter((f) => !/\/(0002|0004|0034)_/.test(f))
		]
			.map((f) => readFileSync(f, 'utf8'))
			.join('\n');
		for (const table of map.tables) {
			expect(new RegExp(`\\b${table}\\b`).test(code), table).toBe(true);
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

	it.skipIf(!existsSync(generated))(
		'writes a load script that carries those safeguards, for those tables alone',
		() => {
			const script = readFileSync(generated, 'utf8');
			const head = script.slice(0, 4000);
			expect(head).toContain('session_replication_role = replica');
			expect(head).toContain('set constraints all deferred');
			const loaded = [...script.matchAll(/^-- ---- \S+ -> ypl\.([a-z0-9_]+)/gm)].map((m) => m[1]).sort();
			expect(loaded).toEqual([...map.tables].sort());
		}
	);
});
