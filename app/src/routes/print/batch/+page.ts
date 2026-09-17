// Batch print loader. Gathers everything queued for one business date — the
// four daily operational reports plus every guest document the queue RPC says
// is due — so the whole set prints from one screen, one paper stock at a time.

import {
	TODAY,
	reportCheckInFolio,
	reportCheckoutBillHeader,
	reportCheckoutBillLines,
	reportConfirmation,
	reportFolioReceipts,
	reportGuestDocumentQueue,
	reportHousekeeping,
	reportInHouse,
	reportKitchenMeal,
	reportKitchenMealTotalGuests,
	reportManualSales,
	reportStayRooms
} from '$lib/data/queries.js';
import type {
	CheckoutBillHeader,
	CheckoutBillLine,
	ConfirmationReport,
	FolioReceipt,
	FolioReport,
	HousekeepingRow,
	InHouseRow,
	KitchenMealRow,
	ManualSalesRow,
	StayRoomRow
} from '$lib/data/types.js';
import { addDays } from '$lib/format.js';
import type { PageLoad } from './$types.js';

export interface BatchReports {
	housekeeping: HousekeepingRow[];
	inHouse: InHouseRow[];
	kitchenRows: KitchenMealRow[];
	kitchenTotalGuests: number;
	manualSales: ManualSalesRow[];
}

export interface BatchBill {
	header: CheckoutBillHeader;
	lines: CheckoutBillLine[];
}

/** A confirmation slip with the rooms the stay runs through. */
export interface BatchConfirmation {
	report: ConfirmationReport;
	rooms: StayRoomRow[];
}

/** A folio with the stay's rooms and the money already received for it. */
export interface BatchFolio {
	report: FolioReport;
	rooms: StayRoomRow[];
	receipts: FolioReceipt[];
}

const DEFAULT_INCLUDE = 'reports,confirmations,folios,bills';

// One failed document must not sink the whole batch — the rest of the set
// still prints, and the missing page surfaces as a skipped count on screen.
function orNull<T>(p: Promise<T>): Promise<T | null> {
	return p.catch((e) => {
		console.error('Batch print: skipping a document that failed to load', e);
		return null;
	});
}

async function loadReports(date: string): Promise<BatchReports> {
	const [housekeeping, inHouse, kitchenRows, kitchenTotalGuests, manualSales] = await Promise.all([
		reportHousekeeping(date),
		reportInHouse(date),
		reportKitchenMeal(date),
		reportKitchenMealTotalGuests(date),
		reportManualSales(date)
	]);
	return { housekeeping, inHouse, kitchenRows, kitchenTotalGuests, manualSales };
}

async function loadConfirmations(date: string): Promise<BatchConfirmation[]> {
	const queue = await reportGuestDocumentQueue('confirmation', date);
	const docs = await Promise.all(
		queue.map((q) =>
			orNull(
				Promise.all([
					reportConfirmation(q.reservationid),
					reportStayRooms(q.reservationid)
				]).then(([report, rooms]) => (report ? { report, rooms } : null))
			)
		)
	);
	return docs.filter((r): r is BatchConfirmation => r != null);
}

async function loadFolios(date: string): Promise<BatchFolio[]> {
	const queue = await reportGuestDocumentQueue('check_in_folio', date);
	const docs = await Promise.all(
		queue.map((q) =>
			orNull(
				Promise.all([
					reportCheckInFolio(q.reservationid),
					reportStayRooms(q.reservationid),
					reportFolioReceipts(q.reservationid)
				]).then(([report, rooms, receipts]) => (report ? { report, rooms, receipts } : null))
			)
		)
	);
	return docs.filter((r): r is BatchFolio => r != null);
}

async function loadBills(date: string): Promise<BatchBill[]> {
	const queue = await reportGuestDocumentQueue('checkout_bill', date);
	const docs = await Promise.all(
		queue.map((q) =>
			orNull(
				Promise.all([
					reportCheckoutBillHeader(q.reservationid),
					reportCheckoutBillLines(q.reservationid)
				]).then(([header, lines]) => (header ? { header, lines } : null))
			)
		)
	);
	return docs.filter((b): b is BatchBill => b != null);
}

export const load: PageLoad = async ({ url }) => {
	// Tomorrow is the default batch: the client preps the next day's set each evening.
	const date = url.searchParams.get('date') ?? addDays(TODAY, 1);
	const include = new Set(
		(url.searchParams.get('include') ?? DEFAULT_INCLUDE)
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean)
	);

	const [reports, confirmations, folios, bills] = await Promise.all([
		include.has('reports') ? loadReports(date) : null,
		include.has('confirmations') ? loadConfirmations(date) : [],
		include.has('folios') ? loadFolios(date) : [],
		include.has('bills') ? loadBills(date) : []
	]);

	return { date, reports, confirmations, folios, bills };
};
