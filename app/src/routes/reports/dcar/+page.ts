import {
	reportDcarPayments,
	reportDcarSummary,
	reportDcarUpper,
	TODAY
} from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ url }) => {
	const date = url.searchParams.get('date') ?? TODAY;
	const [upper, payments, summary] = await Promise.all([
		reportDcarUpper(date),
		reportDcarPayments(date),
		reportDcarSummary(date)
	]);
	return { date, upper, payments, summary };
};
