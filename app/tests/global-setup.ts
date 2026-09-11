// Global setup: verifies the local Supabase stack is up, ensures the staff
// login exists, and starts the app dev server if nothing answers at APP_URL.

import { spawn, type ChildProcess } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { ANON_KEY, APP_URL, SERVICE_ROLE_KEY, STAFF_EMAIL, STAFF_PASSWORD, SUPABASE_URL } from './helpers/env';

async function ok(url: string, headers: Record<string, string> = {}): Promise<boolean> {
	try {
		const res = await fetch(url, { headers });
		return res.ok;
	} catch {
		return false;
	}
}

async function ensureStaffUser(): Promise<void> {
	const headers = {
		apikey: SERVICE_ROLE_KEY,
		Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
		'Content-Type': 'application/json'
	};
	const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { headers });
	if (res.ok) {
		const body = (await res.json()) as { users?: { email: string }[] };
		if (body.users?.some((u) => u.email === STAFF_EMAIL)) return;
	}
	await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ email: STAFF_EMAIL, password: STAFF_PASSWORD, email_confirm: true })
	});
}

// Removes data left by previous test runs so day-scoped assertions start
// clean. All test fixtures book as 'QA' and use ZZ-prefixed guest names — a
// fixture that saves through a screen has to set the booked-by initials, or
// its reservation survives this and pins its guest down.
async function cleanPreviousRuns(): Promise<void> {
	const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
		db: { schema: 'ypl' },
		auth: { persistSession: false }
	});
	for (;;) {
		const { data } = await db
			.from('reservations')
			.select('reservationid')
			.or('resbookedby.eq.QA,resgroupname.like.explicit-%')
			.limit(500);
		if (!data?.length) break;
		const ids = data.map((r) => r.reservationid);
		// Left unchecked, a delete that cannot go through leaves this asking
		// for the same rows for ever.
		const { error } = await db.from('reservations').delete().in('reservationid', ids);
		if (error) throw new Error(`could not clear ${ids.length} test reservations: ${error.message}`);
	}
	for (;;) {
		const { data } = await db
			.from('guests')
			.select('guestid')
			.like('guestlastname', 'ZZ%')
			.limit(500);
		if (!data?.length) break;
		const ids = data.map((g) => g.guestid);
		await db.from('kitchen_meals').delete().in('guestid', ids);
		const { error } = await db.from('guests').delete().in('guestid', ids);
		if (error) throw new Error(`could not clear ${ids.length} test guests: ${error.message}`);
	}
}

export default async function setup(): Promise<() => Promise<void>> {
	if (!(await ok(`${SUPABASE_URL}/auth/v1/health`, { apikey: ANON_KEY }))) {
		throw new Error(
			`Supabase is not reachable at ${SUPABASE_URL}. Run \`supabase start\` from the repo root first.`
		);
	}
	await ensureStaffUser();
	await cleanPreviousRuns();

	let dev: ChildProcess | null = null;
	if (!(await ok(APP_URL))) {
		const port = new URL(APP_URL).port || '5173';
		dev = spawn('npm', ['run', 'dev', '--', '--port', port], {
			cwd: new URL('..', import.meta.url).pathname,
			stdio: 'ignore',
			detached: false
		});
		const deadline = Date.now() + 60_000;
		while (Date.now() < deadline) {
			if (await ok(APP_URL)) break;
			await new Promise((r) => setTimeout(r, 500));
		}
		if (!(await ok(APP_URL))) {
			dev.kill();
			throw new Error(`App dev server did not come up at ${APP_URL}.`);
		}
	}

	return async () => {
		if (dev) dev.kill();
	};
}
