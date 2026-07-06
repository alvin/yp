import { reportManualSales, TODAY } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ url }) => {
	const date = url.searchParams.get('date') ?? TODAY;
	const includeCancelled = url.searchParams.get('cancelled') === '1';
	return { date, includeCancelled, rows: await reportManualSales(date, includeCancelled) };
};
