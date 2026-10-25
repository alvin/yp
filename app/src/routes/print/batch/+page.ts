// Batch print loader. Gathers everything queued for one business date — the
// four daily operational reports plus every guest document the queue RPC says
// is due — so the whole set prints from one screen: the reports together, and
// each kind of guest document on its own.

import {
	TODAY,
	guestsInHouse,
	reportCancellationNotice,
	reportGuestDocumentQueue,
	reportHousekeeping,
	reportInHouse,
	reportKitchenMeal,
	reportManualSales
} from '$lib/data/queries.js';
import { billDoc, confirmationDoc, folioDoc } from '$lib/data/guest-documents.js';
import type { GuestDocument } from '$lib/data/types.js';
import { addDays } from '$lib/format.js';
import type { PageLoad } from './$types.js';

async function loadReports(date: string) {
	const [housekeeping, inHouse, kitchenRows, totalGuests, manualSales] = await Promise.all([
		reportHousekeeping(date),
		reportInHouse(date),
		reportKitchenMeal(date),
		guestsInHouse(date),
		reportManualSales(date)
	]);
	return { housekeeping, inHouse, kitchenRows, totalGuests, manualSales };
}

// One failed document must not sink the whole batch — the rest of the set
// still prints; the one that failed is left out and logged.
function orNull<T>(p: Promise<T>): Promise<T | null> {
	return p.catch((e) => {
		console.error('Batch print: skipping a document that failed to load', e);
		return null;
	});
}

/** Every document of one kind the queue holds for the date. */
async function loadQueued<T>(
	document: GuestDocument,
	date: string,
	loadDoc: (reservationid: number) => Promise<T | null>
): Promise<T[]> {
	const queue = await reportGuestDocumentQueue(document, date);
	const docs = await Promise.all(queue.map((q) => orNull(loadDoc(q.reservationid))));
	return docs.filter((doc) => doc != null) as T[];
}

export const load: PageLoad = async ({ url }) => {
	// Tomorrow is the default batch: the client preps the next day's set each evening.
	const date = url.searchParams.get('date') ?? addDays(TODAY, 1);

	const [reports, confirmations, folios, bills, cancellations] = await Promise.all([
		loadReports(date),
		loadQueued('confirmation', date, confirmationDoc),
		loadQueued('check_in_folio', date, folioDoc),
		loadQueued('checkout_bill', date, billDoc),
		loadQueued('cancellation_notice', date, reportCancellationNotice)
	]);

	return { date, reports, confirmations, folios, bills, cancellations };
};
