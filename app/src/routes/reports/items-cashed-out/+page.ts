import { reportDcarUpper, reportItemsCashedOut, TODAY } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ url }) => {
	const date = url.searchParams.get('date') ?? TODAY;
	const [rows, upper] = await Promise.all([reportItemsCashedOut(date), reportDcarUpper(date)]);
	const line = (item: string) => upper.find((r) => r.item === item)?.amount ?? 0;
	return {
		date,
		rows,
		dcar_sales_and_taxes: line('Total Sales and Charges') + line('Total Taxes')
	};
};
