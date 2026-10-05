// Report-family navigation. Reports that belong to one workflow render as
// tabs sharing the working date, so staff move between them without leaving
// the workflow (the spec's daily-cash and printing wireframes show exactly
// this pattern).

import type { GuestDocument } from './data/types.js';

export interface ReportTab {
	label: string;
	href: string;
	current: boolean;
}

/** Daily cash reporting: the DCAR and its four appendices. */
export function dailyCashTabs(date: string, current: string): ReportTab[] {
	return [
		{ label: 'Daily Cash Report', slug: 'dcar' },
		{ label: 'Deposits received', slug: 'deposits-received' },
		{ label: 'Deposits applied', slug: 'deposits-applied' },
		{ label: 'Cashier detail', slug: 'cashier-detail' },
		{ label: 'Items cashed out', slug: 'items-cashed-out' }
	].map((t) => ({
		label: t.label,
		href: `/reports/${t.slug}?date=${date}`,
		current: t.slug === current
	}));
}

/** Daily operations reports, sharing the selected day. */
export function opsTabs(date: string, current: string): ReportTab[] {
	return [
		{ label: 'Housekeeping', slug: 'housekeeping' },
		{ label: 'In house', slug: 'in-house' },
		{ label: 'Kitchen / meals', slug: 'kitchen' },
		{ label: 'Kitchen (filtered)', slug: 'kitchen-filtered' },
		{ label: 'Manual sales', slug: 'manual-sales' },
		{ label: 'Cancellations', slug: 'cancellation-list' }
	].map((t) => ({
		label: t.label,
		href: t.slug === 'kitchen-filtered' ? `/reports/${t.slug}?from=${date}` : `/reports/${t.slug}?date=${date}`,
		current: t.slug === current
	}));
}

/** The guest documents: `key` is the print queue's name for it, `slug` its report route. */
export const GUEST_DOCUMENTS: { key: GuestDocument; label: string; slug: string }[] = [
	{ key: 'confirmation', label: 'Confirmation', slug: 'confirmation' },
	{ key: 'check_in_folio', label: 'Check-in folio', slug: 'check-in-folio' },
	{ key: 'checkout_bill', label: 'Check-out bill', slug: 'checkout-bill' },
	{ key: 'cancellation_notice', label: 'Cancellation', slug: 'cancellation' }
];

/** Guest documents for one reservation. A cancellation notice exists only for a
 * cancelled one. */
export function guestDocTabs(resnumber: number, current: string, cancelled: boolean): ReportTab[] {
	return GUEST_DOCUMENTS.filter((t) => cancelled || t.key !== 'cancellation_notice').map((t) => ({
		label: t.label,
		href: `/reports/${t.slug}/${resnumber}`,
		current: t.slug === current
	}));
}
