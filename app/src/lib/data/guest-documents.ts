// A guest document with everything it prints, for one stay. The document's own
// screen and the batch print run load it the same way; each is null when the
// stay has no such document.

import {
	reportCheckInFolio,
	reportCheckoutBillHeader,
	reportCheckoutBillLines,
	reportConfirmation,
	reportFolioReceipts,
	reportStayRooms
} from './queries.js';
import type {
	CheckoutBillHeader,
	CheckoutBillLine,
	ConfirmationReport,
	FolioReceipt,
	FolioReport,
	StayRoomRow
} from './types.js';

/** A confirmation slip with the rooms the stay runs through. */
export interface ConfirmationDoc {
	report: ConfirmationReport;
	rooms: StayRoomRow[];
}

/** A folio with the stay's rooms and the money already received for it. */
export interface FolioDoc {
	report: FolioReport;
	rooms: StayRoomRow[];
	receipts: FolioReceipt[];
}

export interface BillDoc {
	header: CheckoutBillHeader;
	lines: CheckoutBillLine[];
}

export async function confirmationDoc(reservationid: number): Promise<ConfirmationDoc | null> {
	const [report, rooms] = await Promise.all([
		reportConfirmation(reservationid),
		reportStayRooms(reservationid)
	]);
	return report ? { report, rooms } : null;
}

export async function folioDoc(reservationid: number): Promise<FolioDoc | null> {
	const [report, rooms, receipts] = await Promise.all([
		reportCheckInFolio(reservationid),
		reportStayRooms(reservationid),
		reportFolioReceipts(reservationid)
	]);
	return report ? { report, rooms, receipts } : null;
}

export async function billDoc(reservationid: number): Promise<BillDoc | null> {
	const [header, lines] = await Promise.all([
		reportCheckoutBillHeader(reservationid),
		reportCheckoutBillLines(reservationid)
	]);
	return header ? { header, lines } : null;
}
