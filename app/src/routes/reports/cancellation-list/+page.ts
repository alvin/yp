import { reportCancellationList, TODAY } from '$lib/data/queries.js';
import { addDays } from '$lib/format.js';
import type { PageLoad } from './$types.js';

// Not a daily report: the lodge reads it over a stretch of days. Without a
// range, the week ending today.
export const load: PageLoad = async ({ url }) => {
	const to = url.searchParams.get('to') ?? TODAY;
	const from = url.searchParams.get('from') ?? addDays(to, -6);
	return { from, to, rows: await reportCancellationList(from, to) };
};
