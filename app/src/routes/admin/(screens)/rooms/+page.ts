import { adminRooms, rateCodes, roomRatesFromToday, roomTypes } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async () => {
	const [rooms, rates, codes, types] = await Promise.all([
		adminRooms(),
		roomRatesFromToday(),
		rateCodes(),
		roomTypes()
	]);
	return { rooms, rates, codes, types };
};
