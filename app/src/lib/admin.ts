// The admin area (/admin) is for one login. The database holds the rule
// (`ypl.is_admin()`, which also guards every write the area makes); the app
// uses the same address to decide what to show and where to land.

import { TODAY } from './data/queries.js';

export const ADMIN_EMAIL = 'admin@yellowpointlodge.com';

export function isAdmin(email: string | null | undefined): boolean {
	return email?.toLowerCase() === ADMIN_EMAIL;
}

// The five taxes the lodge charges, as it names them. The rate table also
// carries HST and Hotel tax from Access, both at 0% today; they stay in the
// database and are left off the screen.
export const TAXES: { type: string; name: string }[] = [
	{ type: 'GST', name: 'GST' },
	{ type: 'PST', name: 'PST' },
	{ type: 'Liquor', name: 'Liquor Tax' },
	{ type: 'Room', name: 'Room Tax' },
	{ type: 'DMT', name: 'Destination Marketing Tax' }
];

export function taxName(type: string): string {
	return TAXES.find((t) => t.type === type)?.name ?? type;
}

/** A rate as a percentage, without the float noise the table stores (0.07000000000000001 → 7). */
export function percent(rate: number): number {
	return Math.round(rate * 100 * 10_000) / 10_000;
}

/** Where a dated rate stands today. */
export function rateStatus(from: string, to: string): 'current' | 'upcoming' | 'past' {
	if (from > TODAY) return 'upcoming';
	return to < TODAY ? 'past' : 'current';
}

/**
 * The rate a new one ends: the one running when it starts, if it runs no
 * longer than the new one. The database does the same when it is saved.
 */
export function rateEnded<T extends { from: string; to: string }>(
	rates: T[],
	from: string,
	to: string
): T | undefined {
	return rates.find((r) => r.from < from && r.to >= from && r.to <= to);
}

/** The day before a date (YYYY-MM-DD). */
export function dayBefore(date: string): string {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/** The query string for the sales report: the dates, the view and the codes chosen. */
export function salesQuery(from: string, to: string, view: 'all' | 'selected', codes: string[]): string {
	const params = new URLSearchParams({ from, to });
	if (view === 'selected') params.set('view', 'selected');
	for (const c of codes) params.append('code', c);
	return params.toString();
}
