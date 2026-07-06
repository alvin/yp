// Batch print loader. Gathers everything queued for one business date — the
// four daily operational reports plus every guest document the queue RPC says
// is due — so the whole set prints with a single browser print action.

import {
	TODAY,
	reportCheckInFolio,
	reportCheckoutBillHeader,
	reportCheckoutBillLines,
	reportConfirmation,
	reportGuestDocumentQueue,
	reportHousekeeping,
	reportInHouse,
	reportKitchenMeal,
	reportKitchenMealTotalGuests,
	reportManualSales
} from '$lib/data/queries.js';
import type {
	CheckoutBillHeader,
	CheckoutBillLine,
	ConfirmationReport,
	FolioReport,
	HousekeepingRow,
	InHouseRow,
	KitchenMealRow,
	ManualSalesRow
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

async function loadConfirmations(date: string): Promise<ConfirmationReport[]> {
	const queue = await reportGuestDocumentQueue('confirmation', date);
	const docs = await Promise.all(queue.map((q) => orNull(reportConfirmation(q.reservationid))));
	return docs.filter((r): r is ConfirmationReport => r != null);
}

async function loadFolios(date: string): Promise<FolioReport[]> {
	const queue = await reportGuestDocumentQueue('check_in_folio', date);
	const docs = await Promise.all(queue.map((q) => orNull(reportCheckInFolio(q.reservationid))));
	return docs.filter((r): r is FolioReport => r != null);
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
