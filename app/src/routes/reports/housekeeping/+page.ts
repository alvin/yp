import { inHouseCounts, reportHousekeeping, TODAY } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ url }) => {
	const date = url.searchParams.get('date') ?? TODAY;
	const [rows, counts] = await Promise.all([reportHousekeeping(date), inHouseCounts(date)]);
	return { date, rows, total_guests: counts.total_guests };
};
