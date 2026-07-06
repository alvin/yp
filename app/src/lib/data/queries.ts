// Query layer. Each exported function corresponds 1:1 to a `ypl` view or RPC and
// returns that RPC's exact row shape. Screens call only these functions, so the
// database remains the single source of truth for search, ledgers, and reports.

import { supabase, unwrap } from './client';
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
	InHouseRow,
	ItemsCashedOutRow,
	KitchenFilteredRow,
	KitchenMeal,
	KitchenMealRow,
	LedgerRow,
	ManualSalesRow,
	OccupancySummary,
	ReservationGuestSummary,
	ReservationSummary
} from './types';

/** Today's business date (YYYY-MM-DD, local time). */
export const TODAY = new Date().toLocaleDateString('en-CA');

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
		balance_owing: num(r.balance_owing)
	};
}

// ---------------------------------------------------------------------------
// Lookup-screen and navigation RPCs
// ---------------------------------------------------------------------------

export async function searchGuestsByName(query: string): Promise<GuestSearchRow[]> {
	if (!query.trim()) return [];
	return unwrap(await supabase.rpc('search_guests_by_name', { p_query: query.trim() }));
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

export async function searchByDate(
	date: string,
	mode: DateMode = 'arrivals'
): Promise<DateSearchRow[]> {
	const rows = unwrap(
		await supabase.rpc('search_by_date', { p_date: date, p_mode: mode })
	) as DateSearchRow[];
	return rows.map((r) => ({ ...r, deposit_cdn: num(r.deposit_cdn) }));
}

export async function searchByDateRange(
	from: string,
	to: string,
	mode = 'overlap'
): Promise<DateRangeRow[]> {
	return unwrap(
		await supabase.rpc('search_by_date_range', { p_from: from, p_to: to, p_mode: mode })
	);
}

export async function guestHistory(guestid: number, ref = TODAY): Promise<GuestHistoryRow[]> {
	const rows = unwrap(await supabase.rpc('guest_history', { p_guestid: guestid, p_ref_date: ref }));
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

export async function reservationGuestSummaries(
	reservationid: number
): Promise<ReservationGuestSummary[]> {
	const rows = unwrap(
		await supabase
			.from('v_reservation_guest_summary')
			.select('*')
			.eq('reservationid', reservationid)
			.eq('rgarchive', false)
			.order('primaryguest', { ascending: false })
			.order('reservationguestid')
	) as (ReservationGuestSummary & { rgarchive: boolean })[];
	return rows.map((r) => ({
		...r,
		checkindate: d(r.checkindate)!,
		checkoutdate: d(r.checkoutdate)!,
		checkintime: clock(r.checkintime),
		checkouttime: clock(r.checkouttime),
		balance_owing: num(r.balance_owing)
	}));
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

export interface ReservationNotes {
	housekeeping: HousekeepingNote[];
	kitchen: KitchenMeal[];
	reservationGuests: ReservationGuestSummary[];
}

export async function reservationNotes(reservationid: number): Promise<ReservationNotes> {
	const rgs = await reservationGuestSummaries(reservationid);
	const rgIds = rgs.map((rg) => rg.reservationguestid);
	const guestIds = rgs.map((rg) => rg.guestid);
	const [housekeeping, kitchen] = await Promise.all([
		rgIds.length
			? supabase
					.from('housekeeping_notes')
					.select('*')
					.in('reservationguestid', rgIds)
					.eq('hkarchive', false)
					.order('hknotesdate', { ascending: false })
					.then(unwrap)
			: Promise.resolve([]),
		guestIds.length
			? supabase
					.from('kitchen_meals')
					.select('*')
					.in('guestid', guestIds)
					.eq('kmarchive', false)
					.order('kitchenmealid')
					.then(unwrap)
			: Promise.resolve([])
	]);
	return {
		housekeeping: (housekeeping as HousekeepingNote[]).map((h) => ({
			...h,
			hknotesdate: d(h.hknotesdate)
		})),
		kitchen: kitchen as KitchenMeal[],
		reservationGuests: rgs
	};
}

// ---------------------------------------------------------------------------
// Guest documents
// ---------------------------------------------------------------------------

export async function reportConfirmation(
	reservationid: number
): Promise<ConfirmationReport | null> {
	const rows = unwrap(
		await supabase.rpc('report_reservation_confirmation', { p_reservationid: reservationid })
	);
	return rows[0] ?? null;
}

export async function reportCheckInFolio(reservationid: number): Promise<FolioReport | null> {
	const rows = unwrap(
		await supabase.rpc('report_check_in_folio', { p_reservationid: reservationid })
	);
	return rows[0] ?? null;
}

export async function reportCheckoutBillHeader(
	reservationid: number
): Promise<CheckoutBillHeader | null> {
	const rows = unwrap(
		await supabase.rpc('report_checkout_bill_header', { p_reservationid: reservationid })
	);
	return rows[0] ?? null;
}

export async function reportCheckoutBillLines(reservationid: number): Promise<CheckoutBillLine[]> {
	return unwrap(await supabase.rpc('report_checkout_bill_lines', { p_reservationid: reservationid }));
}

export async function reportCancellationNotice(
	reservationid: number
): Promise<CancellationReport | null> {
	const rows = unwrap(
		await supabase.rpc('report_cancellation_notice', { p_reservationid: reservationid })
	);
	return rows[0] ?? null;
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

export async function reportKitchenMeal(date: string): Promise<KitchenMealRow[]> {
	return unwrap(await supabase.rpc('report_kitchen_meal', { p_date: date }));
}

export async function reportKitchenMealTotalGuests(date: string): Promise<number> {
	return unwrap(await supabase.rpc('report_kitchen_meal_total_guests', { p_date: date }));
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

export async function reportCancellationList(date: string): Promise<CancellationListRow[]> {
	return unwrap(await supabase.rpc('report_cancellation_list', { p_date: date }));
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
		business_date: d(s.business_date)!,
		upper_total: num(s.upper_total),
		receipts_total: num(s.receipts_total),
		balance_owed: num(s.balance_owed)
	};
}

export async function reportDepositsReceived(date: string): Promise<DepositReportRow[]> {
	const rows = unwrap(
		await supabase.rpc('report_deposits_received', { p_date: date })
	) as DepositReportRow[];
	return rows.map((r) => ({ ...r, pymt_amount: num(r.pymt_amount), pymt_cdn: num(r.pymt_cdn) }));
}

export async function reportDepositsApplied(date: string): Promise<DepositReportRow[]> {
	const rows = unwrap(
		await supabase.rpc('report_deposits_applied', { p_date: date })
	) as DepositReportRow[];
	return rows.map((r) => ({ ...r, pymt_amount: num(r.pymt_amount), pymt_cdn: num(r.pymt_cdn) }));
}

export async function reportCashierDetail(date: string): Promise<CashierDetailRow[]> {
	const rows = unwrap(
		await supabase.rpc('report_cashier_detail', { p_date: date })
	) as CashierDetailRow[];
	return rows.map((r) => ({ ...r, amount: num(r.amount), pymt_date: d(r.pymt_date)! }));
}

export async function reportItemsCashedOut(date: string): Promise<ItemsCashedOutRow[]> {
	const rows = unwrap(
		await supabase.rpc('report_items_cashed_out', { p_date: date })
	) as ItemsCashedOutRow[];
	return rows.map((r) => ({
		...r,
		total: num(r.total),
		gst: num(r.gst),
		pst: num(r.pst),
		hst: num(r.hst),
		dmt: num(r.dmt),
		liquor: num(r.liquor),
		room_tax: num(r.room_tax),
		hotel_tax: num(r.hotel_tax)
	}));
}
