import { getGuest, TODAY } from '$lib/data/queries.js';
import { oneYearAhead } from '$lib/format.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ url }) => {
	const guestId = url.searchParams.get('guest');
	const guest = guestId ? ((await getGuest(Number(guestId))) ?? null) : null;
	return { guest, today: TODAY, maxDate: oneYearAhead(TODAY) };
};
