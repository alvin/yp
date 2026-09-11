import {
	findReservation,
	getGuest,
	guestKitchenMeal,
	occupancySummaries,
	TODAY
} from '$lib/data/queries.js';
import { addDays, bookingHorizon, nextSeason, nightsBetween } from '$lib/format.js';
import type { PageLoad } from './$types.js';

/**
 * `?guest=` opens the screen with a guest attached; `?from=` opens it as a
 * re-book — the same party, the same room, next season's dates, all of it
 * editable before saving. A re-book writes an ordinary new reservation and
 * leaves the stay it came from untouched.
 */
export const load: PageLoad = async ({ url }) => {
	const from = Number(url.searchParams.get('from'));
	const source = from ? await findReservation(from) : null;

	const guestId = source?.primary_guestid ?? (Number(url.searchParams.get('guest')) || null);
	const [guest, kitchen, occupancy] = await Promise.all([
		guestId ? getGuest(guestId) : Promise.resolve(undefined),
		guestId ? guestKitchenMeal(guestId) : Promise.resolve(undefined),
		source ? occupancySummaries(source.reservationid) : Promise.resolve([])
	]);

	// Next season's dates, same length of stay, for the clerk to confirm.
	const arrival = source ? nextSeason(source.resarrivaldate, TODAY) : '';
	const nights = source ? nightsBetween(source.resarrivaldate, source.resdeparturedate) : 0;

	return {
		guest: guest ?? null,
		kitchen: kitchen ?? null,
		today: TODAY,
		maxDate: bookingHorizon(TODAY),
		source: source && {
			resnumber: source.resnumber,
			arrival,
			departure: addDays(arrival, nights),
			roomid: occupancy[0]?.roomid ?? null,
			numadults: source.numadults,
			numchildren: source.numchildren ?? 0,
			bedtype: source.bedtype,
			groupname: source.resgroupname
		}
	};
};
