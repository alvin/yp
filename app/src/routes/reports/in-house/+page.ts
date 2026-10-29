import { inHouseCounts, reportInHouse, TODAY } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ url }) => {
	const date = url.searchParams.get('date') ?? TODAY;
	const [rows, counts] = await Promise.all([reportInHouse(date), inHouseCounts(date)]);
	return { date, rows, counts };
};
