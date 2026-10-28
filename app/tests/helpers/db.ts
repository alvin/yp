// Database-side test helpers: Supabase clients against the `ypl` schema plus
// fixture utilities. Tests create their own data with unique names and
// isolated historical business dates, so they never interfere with each other
// or with real data in the target environment.

import { createClient } from '@supabase/supabase-js';
import { ANON_KEY, STAFF_EMAIL, STAFF_PASSWORD, SUPABASE_URL } from './env';

export type YplClient = ReturnType<typeof anonClient>;

export function anonClient() {
	return createClient(SUPABASE_URL, ANON_KEY, {
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
	bedtype?: string;
}

export interface RoomRow {
	roomid: number;
	roomname: string;
	roomnumber: string | null;
	/** "Name: number", as the reports print it. */
	room: string;
	/** "Name number", as the screens show it. */
	room_compact: string;
	roomorder: number | null;
	roomshorthand: string | null;
}

/** The active rooms in lodge order. */
export function roomDirectory(): Promise<RoomRow[]> {
	return rpc<RoomRow[]>('room_directory');
}

/** First active room in lodge order (stable across environments). */
export async function firstRoomId(): Promise<number> {
	return (await roomDirectory())[0].roomid;
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
		...(opts.bedtype ? { p_bedtype: opts.bedtype } : {}),
		p_roomid: opts.roomid === undefined ? await firstRoomId() : opts.roomid
	});
	return { guestid, ...rows[0], lastname, arrival, departure };
}

// ---------------------------------------------------------------------------
// Posting to a fixture's stay. Each defaults to the stay's own dates and the
// first room, and returns the new line's id.

export interface PayOptions {
	type?: string;
	/** Defaults to the stay's arrival. */
	date?: string;
	currency?: 'Canadian' | 'US';
}

/** Records a payment, deposit or refund against the stay (record_payment). */
export function pay(
	fx: Fixture,
	category: string,
	amount: number,
	opts: PayOptions = {}
): Promise<number> {
	return rpc<number>('record_payment', {
		p_reservationguestid: fx.reservationguestid,
		p_paymentcategory: category,
		p_paymenttype: opts.type ?? 'Visa',
		p_amount: amount,
		p_paymentdate: opts.date ?? fx.arrival,
		...(opts.currency ? { p_currency: opts.currency } : {})
	});
}

export interface RoomNightOptions {
	/** Defaults to the first room. */
	roomid?: number;
	/** The nights covered; default the whole stay. */
	from?: string;
	to?: string;
	/** Defaults to the stay's arrival. */
	transdate?: string;
	ratetype?: 'Regular' | 'Special' | 'Split';
}

/** Posts room nights for the stay (post_room_nights); `rate` null prices from the rate table. */
export async function postRoomNights(
	fx: Fixture,
	rate: number | null,
	opts: RoomNightOptions = {}
): Promise<number> {
	return rpc<number>('post_room_nights', {
		p_reservationguestid: fx.reservationguestid,
		p_roomid: opts.roomid ?? (await firstRoomId()),
		p_occupancyin: opts.from ?? fx.arrival,
		p_occupancyout: opts.to ?? fx.departure,
		...(rate == null ? {} : { p_rate: rate }),
		p_transdate: opts.transdate ?? fx.arrival,
		...(opts.ratetype ? { p_ratetype: opts.ratetype } : {})
	});
}

export interface Item {
	inventoryid: number;
	invcode: string;
	invamount: number;
	invitemdescription: string | null;
}

/** An active price-list item with a list price; `gst` picks one GST is charged on (or not). */
export async function pricedItem(opts: { gst?: boolean } = {}): Promise<Item> {
	const db = await staffClient();
	let query = db
		.from('inventory_items')
		.select('inventoryid, invcode, invamount, invitemdescription')
		.eq('invarchive', false)
		.gt('invamount', 0);
	if (opts.gst !== undefined) query = query.eq('invgst', opts.gst);
	const [item] = unwrap(await query.order('inventoryid').limit(1)) as Item[];
	return { ...item, invamount: Number(item.invamount) };
}

export interface ChargeOptions {
	/** Defaults to pricedItem(). */
	inventoryid?: number;
	quantity?: number;
	/** Overrides the list price. */
	amount?: number;
	/** Defaults to the stay's arrival. */
	transdate?: string;
	transtype?: string;
}

/** Posts an extra charge to the stay (post_charge). */
export async function postCharge(fx: Fixture, opts: ChargeOptions = {}): Promise<number> {
	return rpc<number>('post_charge', {
		p_reservationguestid: fx.reservationguestid,
		p_inventoryid: opts.inventoryid ?? (await pricedItem()).inventoryid,
		p_quantity: opts.quantity ?? 1,
		p_transdate: opts.transdate ?? fx.arrival,
		...(opts.amount === undefined ? {} : { p_amount: opts.amount }),
		...(opts.transtype ? { p_transtype: opts.transtype } : {})
	});
}

/** Cancels the stay (cancel_reservation), dated its arrival unless given. */
export async function cancel(
	fx: Fixture,
	handling: 'none' | 'refund' | 'keep' = 'none',
	date: string = fx.arrival,
	notes: string | null = null
): Promise<void> {
	await rpc('cancel_reservation', {
		p_reservationid: fx.reservationid,
		p_date: date,
		p_deposit_handling: handling,
		p_notes: notes
	});
}

// ---------------------------------------------------------------------------
// Reading a stay back.

export interface RoomWindow {
	occupancyid: number;
	roomid: number;
	/** YYYY-MM-DD */
	occupancyin: string;
	/** YYYY-MM-DD */
	occupancyout: string;
	occupancynumguests: number | null;
}

/** The stay's live rooms, in the order it holds them. */
export async function roomWindows(fx: Pick<Fixture, 'reservationguestid'>): Promise<RoomWindow[]> {
	const db = await staffClient();
	const rows = unwrap(
		await db
			.from('room_assignments')
			.select('occupancyid, roomid, occupancyin, occupancyout, occupancynumguests')
			.eq('reservationguestid', fx.reservationguestid)
			.eq('occupancyarchive', false)
			.order('occupancyin')
			.order('occupancyid')
	) as RoomWindow[];
	return rows.map((w) => ({
		...w,
		occupancyin: w.occupancyin.slice(0, 10),
		occupancyout: w.occupancyout.slice(0, 10)
	}));
}

/** The room the stay was booked into. */
export async function firstOccupancyId(fx: Pick<Fixture, 'reservationguestid'>): Promise<number> {
	return (await roomWindows(fx))[0].occupancyid;
}

export interface LedgerRow {
	line_source: 'transaction' | 'payment';
	line_id: number;
	line_type: string;
	line_date: string;
	description: string;
	code: string | null;
	quantity: number;
	amount: number;
	tax_total: number;
	balance_effect: number;
}

/** The reservation's transactions screen, line for line (reservation_ledger). */
export function ledger(reservationid: number): Promise<LedgerRow[]> {
	return rpc<LedgerRow[]>('reservation_ledger', { p_reservationid: reservationid });
}

/** The reservation id behind a reservation number. */
export async function reservationIdOf(resnumber: number): Promise<number> {
	const [row] = await rpc<{ reservationid: number }[]>('find_reservation', {
		p_resnumber: resnumber
	});
	return row.reservationid;
}

/** A row of the date search (search_by_date). */
export interface DateRow {
	reservationid: number;
	reservationguestid: number;
	resnumber: number;
	guest_name: string;
	guestlastname: string;
	guestfirstname: string | null;
	room: string | null;
	arrival_date: string;
	departure_date: string;
	match_type: 'arrival' | 'departure' | 'in_house';
	numnights: number;
	pax: number;
	deposit_cdn: number;
	rescancelled: boolean;
	shared_room: boolean;
}

/** The date search for one day and mode. */
export function searchByDate(date: string, mode?: string): Promise<DateRow[]> {
	return rpc<DateRow[]>('search_by_date', { p_date: date, ...(mode ? { p_mode: mode } : {}) });
}

/**
 * One line of the Daily Cash Activity Report's upper section for a day, or
 * undefined when the report has no such line. `group` narrows it to Revenue,
 * Taxes or Adjustments where an item name appears in more than one.
 */
export async function dcarLine(
	date: string,
	item: string,
	group?: string
): Promise<number | undefined> {
	const upper = await rpc<{ group_name: string; item: string; amount: number }[]>(
		'report_dcar_upper',
		{ p_date: date }
	);
	const line = upper.find((l) => l.item === item && (!group || l.group_name === group));
	return line ? Number(line.amount) : undefined;
}

/**
 * A charge carrying the taxes given, written straight to the table as the
 * Access import writes one (supplied taxes are kept as stored). Lets a test
 * on an isolated historical date — where every dated tax rate is zero — put
 * an exact, non-zero tax on the day.
 */
export async function insertTaxedCharge(
	fx: Fixture,
	amount: number,
	taxes: { transgstamount?: number; transpstamount?: number; transltamount?: number },
	transdate: string = fx.arrival
): Promise<void> {
	const db = await staffClient();
	unwrap(
		await db
			.from('transactions')
			.insert({
				reservationguestid: fx.reservationguestid,
				transdate,
				transtype: 'Sundries',
				transquantity: 1,
				transamount: amount,
				transgstamount: 0,
				transpstamount: 0,
				transltamount: 0,
				...taxes
			})
			.select('transactionid')
	);
}

/** Removes a charge line entered in error (archive_transaction). */
export async function archiveCharge(transactionid: number): Promise<void> {
	await rpc('archive_transaction', { p_transactionid: transactionid });
}
