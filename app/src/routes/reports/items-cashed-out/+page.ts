import { reportDcarUpper, reportItemsCashedOut, TODAY } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ url }) => {
	const date = url.searchParams.get('date') ?? TODAY;
	const [rows, upper] = await Promise.all([reportItemsCashedOut(date), reportDcarUpper(date)]);
	const line = (item: string) => upper.find((r) => r.item === item)?.amount ?? 0;
	// The appendix lists the items sold, so it ties to the sheet's sales lines
	// other than Room, and Cancellation (a deposit kept is revenue, not an item
	// sold). The sheet's taxes are room and items together, so the tie is on
	// the sales.
	return {
		date,
		rows,
		dcar_item_sales:
			line('Total Sales and Charges') - line('Room') - line('Cancellation')
	};
};
