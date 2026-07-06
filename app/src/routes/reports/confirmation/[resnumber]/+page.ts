import { error } from '@sveltejs/kit';
import { findReservation, reportConfirmation } from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ params }) => {
	const summary = await findReservation(Number(params.resnumber));
	if (!summary) error(404, `Reservation #${params.resnumber} not found`);
	const report = await reportConfirmation(summary.reservationid);
	if (!report) error(404, 'Confirmation is not available for this reservation');
	return { report };
};
