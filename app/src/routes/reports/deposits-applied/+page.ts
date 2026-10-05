import { reportDcarUpper, reportDepositsApplied, TODAY } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ url }) => {
	const date = url.searchParams.get('date') ?? TODAY;
	const [rows, upper] = await Promise.all([reportDepositsApplied(date), reportDcarUpper(date)]);
	// The cash sheet takes the deposits applied off the day's total, so its
	// line is the appendix total with a minus sign.
	return {
		date,
		rows,
		dcar_line: -(upper.find((r) => r.item === 'Deposit (Applied)')?.amount ?? 0)
	};
};
