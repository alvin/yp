// Query layer. Each exported function corresponds 1:1 to a `ypl` view or RPC and
// returns that RPC's exact row shape. Screens call only these functions, so the
// database remains the single source of truth for search, ledgers, and reports.

import { supabase, unwrap } from './client.js';
import { sortItemsByCode } from '../inventory.js';
import type {
	AllFieldsRow,
	CancellationListRow,
	CancellationReport,
	CashierDetailRow,
	CheckoutBillHeader,
	CheckoutBillLine,
	ConfirmationReport,
	DateMode,
	DateRangeRow,
	DateSearchRow,
	DcarPaymentRow,
	DcarSummary,
	DcarUpperRow,
	DepositReportRow,
	FolioReport,
	Guest,
	GuestDocument,
	GuestDocumentQueueRow,
	GuestHistoryRow,
	GuestSearchRow,
	HousekeepingNote,
	HousekeepingRow,
	InHouseCounts,
	InHouseRow,
	InventoryItem,
	ItemsCashedOutRow,
	ItemsSoldRow,
	ItemTypeRow,
	KitchenFilteredRow,
	KitchenMeal,
	KitchenMealRow,
	LedgerRow,
	ManualSalesRow,
	NextYearsDepositsRow,
	OccupancySummary,
	RequestRow,
	GuestRequestRow,
	ReservationGuestSummary,
	ReservationSummary,
	FolioReceipt,
	RateCodeRow,
	Room,
	RoomRateRow,
	RoomRateType,
	RoomTypeRow,
	SharedRoom,
	StayRoomRow,
	TaxRateRow
} from './types.js';

/** Today's business date (YYYY-MM-DD, local time). */
export const TODAY = new Date().toLocaleDateString('en-CA');

/** How many name matches a lookup asks for. The result lists scroll, so this
 * is a comfortable "everyone who could plausibly be meant", not a preview. */
const NAME_SEARCH_LIMIT = 100;

// ---------------------------------------------------------------------------
// Row normalization: ypl table columns are `timestamp without time zone`, so
// PostgREST serializes them as `2025-12-15T00:00:00`. Screens work with plain
// dates and Access-style clock times.
// ---------------------------------------------------------------------------

function d(value: string | null | undefined): string | null {
	return value ? value.slice(0, 10) : null;
}

function clock(value: string | null | undefined): string | null {
	if (!value) return null;
	const time = value.includes('T') ? value.slice(11, 16) : value.slice(0, 5);
	const [h, m] = time.split(':').map(Number);
	if (Number.isNaN(h) || Number.isNaN(m)) return value;
	const suffix = h >= 12 ? 'PM' : 'AM';
	const hour = h % 12 === 0 ? 12 : h % 12;
	return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function num(value: number | string | null | undefined): number {
	return value == null ? 0 : Number(value);
}

function reservationSummaryRow(row: Record<string, unknown>): ReservationSummary {
	const r = row as unknown as ReservationSummary;
	return {
		...r,
		resbookingdate: d(r.resbookingdate),
		resarrivaldate: d(r.resarrivaldate)!,
		resdeparturedate: d(r.resdeparturedate)!,
		resdateconfirmed: d(r.resdateconfirmed),
		resdatecancelled: d(r.resdatecancelled),
		first_room_in: d(r.first_room_in),
		last_room_out: d(r.last_room_out),
		balance_owing: num(r.balance_owing),
		deposit_held: num(r.deposit_held)
	};
}

// ---------------------------------------------------------------------------
// Lookup-screen and navigation RPCs
// ---------------------------------------------------------------------------

/**
 * Partial-name guest search. The database handles keyword splitting and the
 * placeholder punctuation staff type for a half-remembered name ('-illington'),
 * so every screen that looks a guest up behaves identically.
 */
export async function searchGuestsByName(query: string): Promise<GuestSearchRow[]> {
	if (!query.trim()) return [];
	return unwrap(
		await supabase.rpc('search_guests_by_name', {
			p_query: query.trim(),
			p_limit: NAME_SEARCH_LIMIT
		})
	);
}

export async function searchAllFields(query: string): Promise<AllFieldsRow[]> {
	if (!query.trim()) return [];
	return unwrap(await supabase.rpc('search_all_fields', { p_query: query.trim() }));
}

export async function findReservation(resnumber: number): Promise<ReservationSummary | null> {
	if (!Number.isFinite(resnumber)) return null;
	const rows = unwrap(await supabase.rpc('find_reservation', { p_resnumber: resnumber }));
	return rows.length ? reservationSummaryRow(rows[0]) : null;
}

/** The tender the stay's deposit was taken on — offered first for its refund. */
export async function depositTender(reservationid: number): Promise<string | null> {
	return unwrap(
		await supabase.rpc('reservation_deposit_tender', { p_reservationid: reservationid })
	);
}

export async function searchByDate(date: string, mode: DateMode): Promise<DateSearchRow[]> {
	const rows = unwrap(
		await supabase.rpc('search_by_date', { p_date: date, p_mode: mode })
	) as DateSearchRow[];
	return rows.map((r) => ({ ...r, deposit_cdn: num(r.deposit_cdn) }));
}

export async function searchByDateRange(
	from: string,
	to: string,
	mode: string
): Promise<DateRangeRow[]> {
	return unwrap(
		await supabase.rpc('search_by_date_range', { p_from: from, p_to: to, p_mode: mode })
	);
}

export async function guestHistory(guestid: number): Promise<GuestHistoryRow[]> {
	const rows = unwrap(await supabase.rpc('guest_history', { p_guestid: guestid, p_ref_date: TODAY }));
	return rows.map((r: GuestHistoryRow) => ({ ...r, balance_owing: num(r.balance_owing) }));
}

// ---------------------------------------------------------------------------
// Reservation workspace
// ---------------------------------------------------------------------------

export async function getGuest(guestid: number): Promise<Guest | undefined> {
	const rows = unwrap(
		await supabase.from('guests').select('*').eq('guestid', guestid).limit(1)
	) as Guest[];
	return rows[0];
}

/** A guest's diet record. Kitchen meals are keyed by guest, not by stay, so
 * this is what the kitchen already holds for them — one row, written once and
 * revised, never a second row per booking (the kitchen report concatenates
 * every row a guest has). */
export async function guestKitchenMeal(guestid: number): Promise<KitchenMeal | undefined> {
	const rows = unwrap(
		await supabase
			.from('kitchen_meals')
			.select('*')
			.eq('guestid', guestid)
			.eq('kmarchive', false)
			.order('kitchenmealid')
			.limit(1)
	) as KitchenMeal[];
	return rows[0];
}

/** A diet record's text as the kitchen report prints it (`diet_text` in
 * ypl.v_kitchen_diets). The desk keeps a diet as notes alone; a diet type from
 * Access's pick list prints ahead of them, so the screens show it there too,
 * and saving the notes keeps it as part of them. */
export function dietText(meal: KitchenMeal | null | undefined): string {
	return [meal?.guestdiet, meal?.kitchenmealnotes]
		.filter((v) => v?.trim())
		.join(' ')
		.trim();
}

/** The guest a stay is booked under; a reservation holds one. A few Access
 * bookings were left with none. */
async function reservationGuestSummary(
	reservationid: number
): Promise<ReservationGuestSummary | null> {
	const rows = unwrap(
		await supabase
			.from('v_reservation_guest_summary')
			.select('*')
			.eq('reservationid', reservationid)
			.eq('rgarchive', false)
			.limit(1)
	) as (ReservationGuestSummary & { rgarchive: boolean })[];
	const r = rows[0];
	if (!r) return null;
	return {
		...r,
		checkindate: d(r.checkindate)!,
		checkoutdate: d(r.checkoutdate)!,
		checkintime: clock(r.checkintime),
		checkouttime: clock(r.checkouttime)
	};
}

/** Room windows on this stay that another live reservation also holds. */
export async function sharedRoomOccupancies(reservationid: number): Promise<SharedRoom[]> {
	const rows = unwrap(
		await supabase.rpc('shared_room_occupancies', { p_reservationid: reservationid })
	) as SharedRoom[];
	return rows.map((r) => ({ ...r, shared_in: d(r.shared_in)!, shared_out: d(r.shared_out)! }));
}

/** The room windows of a stay that are moves, keyed to the window(s) each moved from. */
export async function roomMoves(reservationid: number): Promise<Map<number, number[]>> {
	const rows = unwrap(
		await supabase.rpc('room_moves', { p_reservationid: reservationid })
	) as { occupancyid: number; from_occupancyid: number }[];
	const moves = new Map<number, number[]>();
	for (const m of rows) moves.set(m.occupancyid, [...(moves.get(m.occupancyid) ?? []), m.from_occupancyid]);
	return moves;
}

export async function occupancySummaries(reservationid: number): Promise<OccupancySummary[]> {
	const rows = unwrap(
		await supabase
			.from('v_occupancy_summary')
			.select('*')
			.eq('reservationid', reservationid)
			.eq('occupancyarchive', false)
			.order('occupancyin')
			.order('roomorder')
	) as (OccupancySummary & { occupancyarchive: boolean })[];
	return rows.map((r) => ({
		...r,
		occupancyin: d(r.occupancyin)!,
		occupancyout: d(r.occupancyout)!
	}));
}

export async function reservationLedger(reservationid: number): Promise<LedgerRow[]> {
	const rows = unwrap(
		await supabase.rpc('reservation_ledger', { p_reservationid: reservationid })
	) as LedgerRow[];
	return rows.map((r) => ({
		...r,
		amount: num(r.amount),
		tax_total: num(r.tax_total),
		balance_effect: num(r.balance_effect),
		running_balance: num(r.running_balance)
	}));
}

/** Rooms another live stay holds for any night from `arrival` to `departure`. */
export async function roomsBooked(arrival: string, departure: string): Promise<Set<number>> {
	const rows = unwrap(
		await supabase.rpc('room_directory', { p_in: arrival, p_out: departure })
	) as { roomid: number; is_available: boolean }[];
	return new Set(rows.filter((r) => !r.is_available).map((r) => r.roomid));
}

/** The nightly rate of a room on a date for a rate type — what post_room_nights charges when no price is given. */
export async function effectiveRoomRate(
	roomid: number,
	date: string,
	ratetype: RoomRateType
): Promise<number | null> {
	const rate = unwrap(
		await supabase.rpc('effective_room_rate', {
			p_roomid: roomid,
			p_date: date,
			p_ratetype: ratetype
		})
	) as number | string | null;
	return rate == null ? null : Number(rate);
}

interface ReservationNotes {
	reservationGuest: ReservationGuestSummary | null;
	kitchenMeal: KitchenMeal | undefined;
	/** The housekeeping note in force, the one that prints. */
	housekeepingNote: string;
}

/** What the notes tabs of a reservation edit: the guest's diet record, the
 * housekeeping note in force and, on the reservation guest, the requests. */
export async function reservationNotes(reservationid: number): Promise<ReservationNotes> {
	const rg = await reservationGuestSummary(reservationid);
	if (!rg) return { reservationGuest: null, kitchenMeal: undefined, housekeepingNote: '' };
	const [kitchenMeal, hk] = await Promise.all([
		guestKitchenMeal(rg.guestid),
		supabase
			.from('v_current_housekeeping_notes')
			.select('housekeepingnotes')
			.eq('reservationguestid', rg.reservationguestid)
			.then(unwrap) as Promise<Pick<HousekeepingNote, 'housekeepingnotes'>[]>
	]);
	return { reservationGuest: rg, kitchenMeal, housekeepingNote: hk[0]?.housekeepingnotes ?? '' };
}

// ---------------------------------------------------------------------------
// Guest documents
// ---------------------------------------------------------------------------

/** A guest document's one row for a stay; null when the stay has none. */
async function documentRow<T>(rpc: string, reservationid: number): Promise<T | null> {
	const rows = unwrap(await supabase.rpc(rpc, { p_reservationid: reservationid })) as T[];
	return rows[0] ?? null;
}

export async function reportConfirmation(
	reservationid: number
): Promise<ConfirmationReport | null> {
	return documentRow('report_reservation_confirmation', reservationid);
}

export async function reportCheckInFolio(reservationid: number): Promise<FolioReport | null> {
	return documentRow('report_check_in_folio', reservationid);
}

/** Every room of a stay, in stay order — the room moves a folio or slip lists. */
export async function reportStayRooms(reservationid: number): Promise<StayRoomRow[]> {
	return unwrap(await supabase.rpc('report_stay_rooms', { p_reservationid: reservationid }));
}

/** Deposits, prepayments and gift certificates already received for a stay. */
export async function reportFolioReceipts(reservationid: number): Promise<FolioReceipt[]> {
	const rows = unwrap(
		await supabase.rpc('report_folio_receipts', { p_reservationid: reservationid })
	) as FolioReceipt[];
	return rows.map((r) => ({ ...r, amount: num(r.amount) }));
}

export async function reportCheckoutBillHeader(
	reservationid: number
): Promise<CheckoutBillHeader | null> {
	return documentRow('report_checkout_bill_header', reservationid);
}

export async function reportCheckoutBillLines(reservationid: number): Promise<CheckoutBillLine[]> {
	return unwrap(await supabase.rpc('report_checkout_bill_lines', { p_reservationid: reservationid }));
}

export async function reportCancellationNotice(
	reservationid: number
): Promise<CancellationReport | null> {
	return documentRow('report_cancellation_notice', reservationid);
}

export async function reportGuestDocumentQueue(
	document: GuestDocument,
	date: string
): Promise<GuestDocumentQueueRow[]> {
	return unwrap(
		await supabase.rpc('report_guest_document_queue', { p_document: document, p_date: date })
	);
}

// ---------------------------------------------------------------------------
// Operational reports
// ---------------------------------------------------------------------------

export async function reportHousekeeping(date: string): Promise<HousekeepingRow[]> {
	return unwrap(await supabase.rpc('report_housekeeping', { p_date: date }));
}

export async function reportInHouse(date: string): Promise<InHouseRow[]> {
	return unwrap(await supabase.rpc('report_in_house', { p_date: date }));
}

/** Guests arriving, departing and in house on a day, and Total Guests (arriving plus in house). */
export async function inHouseCounts(date: string): Promise<InHouseCounts> {
	return unwrap(await supabase.rpc('in_house_counts', { p_date: date }))[0];
}

/** Everyone at the lodge on a day whose stay carries a request. */
export async function reportRequests(date: string): Promise<RequestRow[]> {
	return unwrap(await supabase.rpc('report_requests', { p_date: date }));
}

/** A guest's requests, stay by stay, oldest first. */
export async function reportGuestRequests(guestid: number): Promise<GuestRequestRow[]> {
	return unwrap(await supabase.rpc('report_guest_requests', { p_guestid: guestid }));
}

export async function reportKitchenMeal(date: string): Promise<KitchenMealRow[]> {
	return unwrap(await supabase.rpc('report_kitchen_meal', { p_date: date }));
}

/** Everyone at the lodge on a day, departing guests included and a party moving rooms counted once — the kitchen report's Total Guests. */
export async function guestsInHouse(date: string): Promise<number> {
	return unwrap(await supabase.rpc('guests_in_house', { p_date: date }));
}

export async function reportKitchenMealFiltered(
	from: string,
	to: string
): Promise<KitchenFilteredRow[]> {
	return unwrap(await supabase.rpc('report_kitchen_meal_filtered', { p_from: from, p_to: to }));
}

export async function reportManualSales(
	date: string,
	includeCancelled = false
): Promise<ManualSalesRow[]> {
	return unwrap(
		await supabase.rpc('report_manual_sales', {
			p_date: date,
			p_include_cancelled: includeCancelled
		})
	);
}

/** Stays cancelled from `from` to `to`, by the day cancelled. */
export async function reportCancellationList(
	from: string,
	to: string
): Promise<CancellationListRow[]> {
	return unwrap(await supabase.rpc('report_cancellation_list', { p_from: from, p_to: to }));
}

// ---------------------------------------------------------------------------
// Daily Cash Activity Report + appendices
// ---------------------------------------------------------------------------

export async function reportDcarUpper(date: string): Promise<DcarUpperRow[]> {
	const rows = unwrap(await supabase.rpc('report_dcar_upper', { p_date: date })) as DcarUpperRow[];
	return rows.map((r) => ({ ...r, amount: num(r.amount) }));
}

export async function reportDcarPayments(date: string): Promise<DcarPaymentRow[]> {
	const rows = unwrap(
		await supabase.rpc('report_dcar_payments', { p_date: date })
	) as DcarPaymentRow[];
	return rows.map((r) => ({ ...r, calc_amount: num(r.calc_amount) }));
}

export async function reportDcarSummary(date: string): Promise<DcarSummary> {
	const rows = unwrap(await supabase.rpc('report_dcar_summary', { p_date: date })) as DcarSummary[];
	const s = rows[0];
	return {
		...s,
		upper_total: num(s.upper_total),
		receipts_total: num(s.receipts_total),
		balance_owed: num(s.balance_owed)
	};
}

/** Deposits taken over a range of days for stays after it, month by month. */
export async function reportNextYearsDeposits(
	from: string,
	to: string
): Promise<NextYearsDepositsRow[]> {
	const rows = unwrap(
		await supabase.rpc('report_next_years_deposits', { p_from: from, p_to: to })
	) as NextYearsDepositsRow[];
	return rows.map((r) => ({
		...r,
		month: d(r.month)!,
		received: num(r.received),
		refunded: num(r.refunded),
		kept: num(r.kept),
		held: num(r.held)
	}));
}

/** The sheet's amount on one of its upper lines ('Room', 'Deposit (Received)'…); 0 when absent. */
export function dcarLine(upper: DcarUpperRow[], item: string): number {
	return upper.find((r) => r.item === item)?.amount ?? 0;
}

async function depositRows(rpc: string, date: string): Promise<DepositReportRow[]> {
	const rows = unwrap(await supabase.rpc(rpc, { p_date: date })) as DepositReportRow[];
	return rows.map((r) => ({ ...r, pymt_amount: num(r.pymt_amount), pymt_cdn: num(r.pymt_cdn) }));
}

export async function reportDepositsReceived(date: string): Promise<DepositReportRow[]> {
	return depositRows('report_deposits_received', date);
}

export async function reportDepositsApplied(date: string): Promise<DepositReportRow[]> {
	return depositRows('report_deposits_applied', date);
}

export async function reportCashierDetail(date: string): Promise<CashierDetailRow[]> {
	const rows = unwrap(
		await supabase.rpc('report_cashier_detail', { p_date: date })
	) as CashierDetailRow[];
	return rows.map((r) => ({ ...r, amount: num(r.amount), pymt_date: d(r.pymt_date)! }));
}

function itemsCashedOutRow<T extends ItemsCashedOutRow>(r: T): T {
	return {
		...r,
		total: num(r.total),
		gst: num(r.gst),
		pst: num(r.pst),
		hst: num(r.hst),
		dmt: num(r.dmt),
		liquor: num(r.liquor),
		room_tax: num(r.room_tax),
		hotel_tax: num(r.hotel_tax)
	};
}

export async function reportItemsCashedOut(date: string): Promise<ItemsCashedOutRow[]> {
	const rows = unwrap(
		await supabase.rpc('report_items_cashed_out', { p_date: date })
	) as ItemsCashedOutRow[];
	return rows.map(itemsCashedOutRow);
}

// The API returns at most 1,000 rows a request (the project's max rows); a
// report that can run longer is read a page at a time. Its RPC orders its
// rows, so the pages meet exactly.
const PAGE = 1000;

/** Items Cashed Out over a range of days, every item, with each line's type. */
export async function reportItemsSold(from: string, to: string): Promise<ItemsSoldRow[]> {
	const rows: ItemsSoldRow[] = [];
	for (let start = 0; ; start += PAGE) {
		const page = unwrap(
			await supabase
				.rpc('report_items_sold', { p_from: from, p_to: to })
				.range(start, start + PAGE - 1)
		) as ItemsSoldRow[];
		rows.push(...page);
		if (page.length < PAGE) break;
	}
	return rows.map((r) => ({ ...itemsCashedOutRow(r), cashed_out: d(r.cashed_out)! }));
}

// ---------------------------------------------------------------------------
// Admin area: the tax rates and the price list
// ---------------------------------------------------------------------------

/** Every dated rate of the taxes given, newest first within each. */
export async function taxRates(types: string[]): Promise<TaxRateRow[]> {
	const rows = unwrap(
		await supabase
			.from('tax_rates')
			.select('taxrateid, taxratetype, taxrate, taxratestartdate, taxrateenddate, taxratenotes')
			.eq('taxratearchive', false)
			.in('taxratetype', types)
			.order('taxratestartdate', { ascending: false })
	) as {
		taxrateid: number;
		taxratetype: string;
		taxrate: number;
		taxratestartdate: string;
		taxrateenddate: string;
		taxratenotes: string | null;
	}[];
	return rows.map((r) => ({
		taxrateid: r.taxrateid,
		taxratetype: r.taxratetype,
		taxrate: Number(r.taxrate),
		from: d(r.taxratestartdate)!,
		to: d(r.taxrateenddate)!,
		notes: r.taxratenotes
	}));
}

/** Every item on the price list, those disabled included, in code order. */
export async function priceListItems(): Promise<InventoryItem[]> {
	const rows = unwrap(
		await supabase.from('inventory_items').select('*').order('invcode')
	) as InventoryItem[];
	return sortItemsByCode(
		rows.map((r) => ({ ...r, invamount: r.invamount == null ? null : Number(r.invamount) }))
	);
}

/** The item types, each with the daily cash line it posts to. */
export async function itemTypes(): Promise<ItemTypeRow[]> {
	return unwrap(await supabase.rpc('item_types')) as ItemTypeRow[];
}

/** The daily cash lines an item's charges can post to (every line but Room). */
export async function dailyCashLines(): Promise<string[]> {
	const rows = unwrap(
		await supabase
			.from('lookup_transaction_types')
			.select('transactiontype')
			.neq('transactiontype', 'Room')
			.order('transactiontypeorder')
	) as { transactiontype: string }[];
	return rows.map((r) => r.transactiontype);
}

/** Every room, those disabled included, in the lodge's sort order. */
export async function adminRooms(): Promise<Room[]> {
	const rows = unwrap(
		await supabase.from('rooms').select('*').order('roomorder').order('roomid')
	) as Room[];
	return rows.map((r) => ({ ...r, roomorder: r.roomorder == null ? null : Number(r.roomorder) }));
}

type RoomRateTableRow = {
	roomrateid: number;
	roomid: number;
	roomratetype: RoomRateType;
	roomratecode: string;
	roomrate: number;
	roomratestartdate: string;
	roomrateenddate: string;
	roomratenotes: string | null;
};

function roomRateRow(r: RoomRateTableRow): RoomRateRow {
	return {
		roomrateid: r.roomrateid,
		roomid: r.roomid,
		roomratetype: r.roomratetype,
		roomratecode: r.roomratecode,
		roomrate: Number(r.roomrate),
		from: d(r.roomratestartdate)!,
		to: d(r.roomrateenddate)!,
		notes: r.roomratenotes
	};
}

const ROOM_RATE_COLUMNS =
	'roomrateid, roomid, roomratetype, roomratecode, roomrate, roomratestartdate, roomrateenddate, roomratenotes';

/** Every room's rates in force today or still to come: a few a room, whatever the years. */
export async function roomRatesFromToday(): Promise<RoomRateRow[]> {
	const rows: RoomRateTableRow[] = [];
	for (let start = 0; ; start += PAGE) {
		const page = unwrap(
			await supabase
				.from('room_rates')
				.select(ROOM_RATE_COLUMNS)
				.eq('roomratearchive', false)
				.gte('roomrateenddate', TODAY)
				.order('roomrateid')
				.range(start, start + PAGE - 1)
		) as RoomRateTableRow[];
		rows.push(...page);
		if (page.length < PAGE) break;
	}
	return rows.map(roomRateRow);
}

/** One room's rates, past ones included, newest first. */
export async function roomRateHistory(roomid: number): Promise<RoomRateRow[]> {
	const rows = unwrap(
		await supabase
			.from('room_rates')
			.select(ROOM_RATE_COLUMNS)
			.eq('roomid', roomid)
			.eq('roomratearchive', false)
			.order('roomratestartdate', { ascending: false })
	) as RoomRateTableRow[];
	return rows.map(roomRateRow);
}

/** The room rate codes, each with what it stands for. */
export async function rateCodes(): Promise<RateCodeRow[]> {
	return unwrap(await supabase.rpc('rate_codes')) as RateCodeRow[];
}

/** The room types. */
export async function roomTypes(): Promise<RoomTypeRow[]> {
	return unwrap(await supabase.rpc('room_types')) as RoomTypeRow[];
}
