import { reportNextYearsDeposits, TODAY } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ url }) => {
	const year = Number(url.searchParams.get('year')) || Number(TODAY.slice(0, 4));
	return { year, rows: await reportNextYearsDeposits(year) };
};
