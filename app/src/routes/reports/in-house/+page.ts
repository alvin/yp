import { guestsInHouse, reportInHouse, TODAY } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ url }) => {
	const date = url.searchParams.get('date') ?? TODAY;
	const [rows, total_guests] = await Promise.all([reportInHouse(date), guestsInHouse(date)]);
	return { date, rows, total_guests };
};
