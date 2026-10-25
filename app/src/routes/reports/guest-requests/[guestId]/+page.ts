import { error } from '@sveltejs/kit';
import { getGuest, reportGuestRequests } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ params, url }) => {
	const guestid = Number(params.guestId);
	const [guest, rows] = await Promise.all([getGuest(guestid), reportGuestRequests(guestid)]);
	if (!guest) error(404, 'Guest not found');
	// Opened from a reservation, Back returns to it; otherwise to the guest.
	const from = url.searchParams.get('from');
	return { guest, rows, back: from ? `/reservations/${from}` : `/guests/${guestid}` };
};
