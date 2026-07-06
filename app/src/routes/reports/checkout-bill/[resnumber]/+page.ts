import { error } from '@sveltejs/kit';
import {
	findReservation,
	reportCheckoutBillHeader,
	reportCheckoutBillLines
} from '$lib/data/queries.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ params }) => {
	const summary = await findReservation(Number(params.resnumber));
	if (!summary) error(404, `Reservation #${params.resnumber} not found`);
	const header = await reportCheckoutBillHeader(summary.reservationid);
	if (!header) error(404, 'Bill is not available for this reservation');
	return {
		header,
		lines: await reportCheckoutBillLines(summary.reservationid)
	};
};
