import { reportDcarUpper, reportDepositsReceived, TODAY } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ url }) => {
	const date = url.searchParams.get('date') ?? TODAY;
	const [rows, upper] = await Promise.all([reportDepositsReceived(date), reportDcarUpper(date)]);
	return {
		date,
		rows,
		dcar_line: upper.find((r) => r.item === 'Deposit (Received)')?.amount ?? 0
	};
};
