import { dailyCashLines, itemTypes, priceListItems } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async () => {
	const [items, types, lines] = await Promise.all([priceListItems(), itemTypes(), dailyCashLines()]);
	return { items, types, lines };
};
