import { reportCashierDetail, reportDcarSummary, TODAY } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ url }) => {
	const date = url.searchParams.get('date') ?? TODAY;
	const [rows, summary] = await Promise.all([reportCashierDetail(date), reportDcarSummary(date)]);
	return { date, rows, receipts_total: summary.receipts_total };
};
