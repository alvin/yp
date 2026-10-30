import { reportItemsSold, TODAY } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

// Every item cashed out between two dates, this month so far unless given.
// Which of them the Selected view lists is chosen on the page and kept in the
// address, so it survives a reload and a print.
export const load: PageLoad = async ({ url }) => {
	const to = url.searchParams.get('to') ?? TODAY;
	const from = url.searchParams.get('from') ?? `${to.slice(0, 7)}-01`;
	return {
		from,
		to,
		view: url.searchParams.get('view') === 'selected' ? ('selected' as const) : ('all' as const),
		codes: url.searchParams.getAll('code'),
		rows: await reportItemsSold(from, to)
	};
};
