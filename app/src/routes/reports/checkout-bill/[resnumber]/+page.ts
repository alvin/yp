import { error } from '@sveltejs/kit';
import { findReservation } from '$lib/data/queries.js';
import { billDoc } from '$lib/data/guest-documents.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ params }) => {
	const summary = await findReservation(Number(params.resnumber));
	if (!summary) error(404, `Reservation #${params.resnumber} not found`);
	const doc = await billDoc(summary.reservationid);
	if (!doc) error(404, 'Bill is not available for this reservation');
	return { ...doc, cancelled: summary.rescancelled };
};
