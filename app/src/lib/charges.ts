// Shared charge math for the reservation workspace add-charge / add-payment
// dialogs. Mirrors the tax computation used to build mock transactions so on-screen
// edits stay consistent with stored data and the reports.

import { CURRENT_EXCHANGE_RATE, CURRENT_TAX_RATES } from './data/reference.js';

export interface TaxFlags {
	gst: boolean;
	pst: boolean;
	hst: boolean;
	lt: boolean;
	rt: boolean;
	ht: boolean;
	dmt: boolean;
}

export function round2(n: number): number {
	return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function taxTotal(amount: number, f: TaxFlags): number {
	const r = CURRENT_TAX_RATES;
	return round2(
		(f.gst ? amount * r.gst : 0) +
			(f.pst ? amount * r.pst : 0) +
			(f.hst ? amount * r.hst : 0) +
			(f.lt ? amount * r.liquor : 0) +
			(f.rt ? amount * r.room : 0) +
			(f.ht ? amount * r.hotel : 0) +
			(f.dmt ? amount * r.dmt : 0)
	);
}

export function usdToCdn(usd: number): number {
	return round2(usd * CURRENT_EXCHANGE_RATE);
}

// Categories that move money out (reduce receipts, increase guest balance).
export const REFUND_OUT_CATEGORIES = new Set([
	'Deposit (Refund)',
	'Prepayment (Refund)',
	'Paid Out',
	'A/R (Sent To Accounts)'
]);
