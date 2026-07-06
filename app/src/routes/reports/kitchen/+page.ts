import { reportKitchenMeal, reportKitchenMealTotalGuests, TODAY } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ url }) => {
	const date = url.searchParams.get('date') ?? TODAY;
	return {
		date,
		rows: await reportKitchenMeal(date),
		total_guests: await reportKitchenMealTotalGuests(date)
	};
};
