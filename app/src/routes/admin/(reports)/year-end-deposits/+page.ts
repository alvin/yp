import { reportNextYearsDeposits, TODAY } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

// The lodge's year end: January 1 to December 31 of this year, unless other
// dates are given.
export const load: PageLoad = async ({ url }) => {
	const year = TODAY.slice(0, 4);
	const from = url.searchParams.get('from') ?? `${year}-01-01`;
	const to = url.searchParams.get('to') ?? `${year}-12-31`;
	return { from, to, rows: await reportNextYearsDeposits(from, to) };
};
