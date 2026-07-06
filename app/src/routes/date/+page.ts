import { searchByDate, searchByDateRange, TODAY } from '$lib/data/queries.js';
import type { DateMode } from '$lib/data/types.js';
import type { PageLoad } from './$types.js';

export interface DateResultRow {
	reservationid: number;
	resnumber: number;
	guest: string;
	room: string | null;
	arrival: string;
	departure: string;
	match: string;
	nights: number | null;
	pax: number | null;
	deposit_cdn: number | null;
	rescancelled: boolean;
}

export const load: PageLoad = async ({ url }) => {
	const mode = (url.searchParams.get('mode') ?? 'arrivals') as DateMode;
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	const date = url.searchParams.get('date') ?? TODAY;

	if (from && to) {
		const rangeMode = mode === 'in_house' ? 'occupancy' : mode === 'both' ? 'overlap' : mode;
		const rows: DateResultRow[] = (await searchByDateRange(from, to, rangeMode)).map((r) => ({
			reservationid: r.reservationid,
			resnumber: r.resnumber,
			guest: r.guest_name,
			room: r.rooms,
			arrival: r.arrival_date,
			departure: r.departure_date,
			match: r.match_type,
			nights: null,
			pax: null,
			deposit_cdn: null,
			rescancelled: false
		}));
		return { kind: 'range' as const, from, to, mode, rows };
	}

	const rows: DateResultRow[] = (await searchByDate(date, mode)).map((r) => ({
		reservationid: r.reservationid,
		resnumber: r.resnumber,
		guest: `${r.guestlastname}, ${r.guestfirstname ?? ''}`.replace(/, $/, ''),
		room: r.room,
		arrival: r.arrival_date,
		departure: r.departure_date,
		match: r.match_type,
		nights: r.numnights,
		pax: r.pax,
		deposit_cdn: r.deposit_cdn,
		rescancelled: r.rescancelled
	}));
	return { kind: 'single' as const, date, mode, rows };
};
