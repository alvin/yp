import { error } from '@sveltejs/kit';
import { getGuest, guestHistory } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ params }) => {
	const guestid = Number(params.guestId);
	const guest = await getGuest(guestid);
	if (!guest) error(404, 'Guest not found');
	return { guest, history: await guestHistory(guestid) };
};
