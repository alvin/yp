// Report-family navigation. Reports that belong to one workflow render as
// tabs sharing the working date, so staff move between them without leaving
// the workflow (the spec's daily-cash and printing wireframes show exactly
// this pattern).

export interface ReportTab {
	label: string;
	href: string;
	current: boolean;
}

/** Daily cash reporting: the DCAR, its four appendices, and the notes page. */
export function dailyCashTabs(date: string, current: string): ReportTab[] {
	return [
		{ label: 'Daily Cash Report', slug: 'dcar' },
		{ label: 'Deposits received', slug: 'deposits-received' },
		{ label: 'Deposits applied', slug: 'deposits-applied' },
		{ label: 'Cashier detail', slug: 'cashier-detail' },
		{ label: 'Items cashed out', slug: 'items-cashed-out' },
		{ label: 'Notes', slug: 'dcar-notes' }
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

/** Guest documents for one reservation. */
export function guestDocTabs(resnumber: number, current: string): ReportTab[] {
	return [
		{ label: 'Confirmation', slug: 'confirmation' },
		{ label: 'Check-in folio', slug: 'check-in-folio' },
		{ label: 'Check-out bill', slug: 'checkout-bill' },
		{ label: 'Cancellation', slug: 'cancellation' }
	].map((t) => ({
		label: t.label,
		href: `/reports/${t.slug}/${resnumber}`,
		current: t.slug === current
	}));
}
