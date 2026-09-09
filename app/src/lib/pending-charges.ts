// Charges and deposits captured before the reservation they belong to exists.
//
// When a stay is booked — from the new-reservation screen or by re-booking an
// existing one — the front desk usually takes the deposit in the same breath.
// These lines are held on screen until the reservation number comes back, then
// posted through the same workflow RPCs the transaction screen uses, so nothing
// about how they are stored, taxed, or reported differs from a line added later.

import { postCharge, recordPayment } from './data/mutations.js';
import { round2 } from './charges.js';

export interface PendingItemLine {
	id: number;
	kind: 'item';
	inventoryid: number;
	code: string;
	description: string;
	quantity: number;
	unit: number;
	transtype: string;
}

export interface PendingPaymentLine {
	id: number;
	kind: 'payment';
	category: string;
	paymenttype: string;
	currency: string;
	amount: number;
}

export type PendingLine = PendingItemLine | PendingPaymentLine;

let nextId = 0;

/** A client-side key for a line that has no database id yet. */
export function pendingLineId(): number {
	nextId += 1;
	return nextId;
}

/** What the line is worth in the currency it was entered in. */
export function pendingLineAmount(line: PendingLine): number {
	return line.kind === 'item' ? round2(line.unit * line.quantity) : round2(line.amount);
}

export function pendingLineLabel(line: PendingLine): string {
	return line.kind === 'item'
		? `${line.code} · ${line.description}`
		: `${line.category} — ${line.paymenttype}`;
}

/**
 * Posts held lines to a freshly created reservation, in the order they were
 * entered. `date` is the business date the money moved — today, not the arrival
 * date, so a deposit taken at booking lands on today's daily cash report.
 */
export async function postPendingLines(
	reservationguestid: number,
	lines: PendingLine[],
	date: string
): Promise<void> {
	for (const line of lines) {
		if (line.kind === 'item') {
			await postCharge(
				reservationguestid,
				line.inventoryid,
				line.quantity,
				date,
				round2(line.unit * line.quantity),
				line.transtype
			);
		} else {
			await recordPayment(
				reservationguestid,
				line.category,
				line.paymenttype,
				round2(line.amount),
				line.currency,
				date
			);
		}
	}
}
