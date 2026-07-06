// Database-side test helpers: Supabase clients against the `ypl` schema plus
// fixture utilities. Tests create their own data with unique names and
// isolated historical business dates, so they never interfere with each other
// or with real data in the target environment.

import { createClient } from '@supabase/supabase-js';
import { ANON_KEY, SERVICE_ROLE_KEY, STAFF_EMAIL, STAFF_PASSWORD, SUPABASE_URL } from './env';

export type YplClient = ReturnType<typeof anonClient>;

export function anonClient() {
	return createClient(SUPABASE_URL, ANON_KEY, {
		db: { schema: 'ypl' },
		auth: { persistSession: false }
	});
}

export function serviceClient() {
	return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
		db: { schema: 'ypl' },
		auth: { persistSession: false }
	});
}

let staff: YplClient | null = null;

/** A client signed in as front-desk staff — the same access path the app uses. */
export async function staffClient(): Promise<YplClient> {
	if (staff) return staff;
	const client = createClient(SUPABASE_URL, ANON_KEY, {
		db: { schema: 'ypl' },
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email: STAFF_EMAIL,
		password: STAFF_PASSWORD
	});
	if (error) throw new Error(`staff sign-in failed: ${error.message}`);
	staff = client;
	return client;
}

/** Unwraps a PostgREST response, throwing on error. */
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	return result.data as T;
}

/** Calls a ypl RPC as staff and unwraps the result. */
export async function rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T> {
	const client = await staffClient();
	return unwrap<T>(await client.rpc(fn, args));
}

// The counter lives on globalThis: vitest isolates module state per test
// file, but date/name uniqueness must hold across every file a worker runs.
const g = globalThis as { __yplTestCounter?: number };

function next(): number {
	g.__yplTestCounter = (g.__yplTestCounter ?? 0) + 1;
	return g.__yplTestCounter;
}

/** Unique suffix for names created by this test run. Kept short: guest last
 * names are varchar(25), so prefix + suffix must stay inside that. */
export function uid(): string {
	return `${Date.now().toString(36).slice(-5)}${process.pid % 97}x${next()}`;
}

/**
 * A historical business date unique to this call. Day-scoped assertions
 * (reports, daily cash) see only the rows a test created for its date.
 *
 * Isolation guarantees: each vitest worker owns a disjoint 20,000-day block
 * (via VITEST_POOL_ID), calls within a worker stride by 9 days (stays span a
 * few days), and global-setup wipes prior runs' test data — so no two tests,
 * workers, or runs ever share a business date.
 */
const POOL = Number(process.env.VITEST_POOL_ID ?? 0) % 16;

export function isolatedDate(): string {
	const day = POOL * 20_000 + next() * 9;
	const d = new Date(Date.UTC(1200, 0, 1 + day));
	return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
	const [y, m, d] = date.split('-').map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d + days));
	return dt.toISOString().slice(0, 10);
}

export function todayISO(): string {
	return new Date().toLocaleDateString('en-CA');
}

export interface Fixture {
	guestid: number;
	reservationid: number;
	resnumber: number;
	reservationguestid: number;
	lastname: string;
	arrival: string;
	departure: string;
}

export interface FixtureOptions {
	arrival?: string;
	departure?: string;
	nights?: number;
	roomid?: number | null;
	lastname?: string;
	firstname?: string;
	numadults?: number;
	numchildren?: number;
}

/** First active room in lodge order (stable across environments). */
export async function firstRoomId(): Promise<number> {
	const rooms = await rpc<{ roomid: number }[]>('room_directory');
	return rooms[0].roomid;
}

/**
 * Creates a guest + reservation through the same workflow RPCs the app uses.
 * Defaults to an isolated historical stay so date-scoped reports are clean.
 */
export async function makeReservation(opts: FixtureOptions = {}): Promise<Fixture> {
	const lastname = opts.lastname ?? `ZZTest-${uid()}`;
	const arrival = opts.arrival ?? isolatedDate();
	const departure = opts.departure ?? addDays(arrival, opts.nights ?? 3);
	const guestid = await rpc<number>('create_guest', {
		p_lastname: lastname,
		p_firstname: opts.firstname ?? 'Test',
		p_city: 'Ladysmith',
		p_region: 'BC'
	});
	const rows = await rpc<
		{ reservationid: number; resnumber: number; reservationguestid: number }[]
	>('create_reservation', {
		p_guestid: guestid,
		p_arrival: arrival,
		p_departure: departure,
		p_bookedby: 'QA',
		p_numadults: opts.numadults ?? 2,
		p_numchildren: opts.numchildren ?? 0,
		p_roomid: opts.roomid === undefined ? await firstRoomId() : opts.roomid
	});
	return { guestid, ...rows[0], lastname, arrival, departure };
}
