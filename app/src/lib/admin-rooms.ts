// The rooms' rates as the admin area reads them: each room carries its own
// rate rows (one rate type, a code, a price, From and To), as on Access's Room
// form. A rate in force is the one covering the day; rows never overlap, so
// there is at most one.

import { dayBefore } from './admin.js';
import { RATE_TYPES, roomName } from './data/reference.js';
import { TODAY } from './data/queries.js';
import { dateShort, money } from './format.js';
import type { Room, RoomRateRow, RoomRateType } from './data/types.js';

export const RATE_ORDER: RoomRateType[] = ['Regular', 'Special', 'Split'];

/** A room rate being entered or changed. */
export interface RateForm {
	type: RoomRateType;
	code: string;
	price: string | number;
	from: string;
	to: string;
	notes: string;
}

export function rateLabel(type: string): string {
	return RATE_TYPES.find((r) => r.value === type)?.label ?? type;
}

export function roomLabel(room: Pick<Room, 'roomname' | 'roomnumber'>): string {
	return roomName({ roomname: room.roomname ?? '', roomnumber: room.roomnumber });
}

/** A room's rate of a type covering a day. */
export function rateOn(
	rates: RoomRateRow[],
	roomid: number,
	type: RoomRateType,
	day: string = TODAY
): RoomRateRow | undefined {
	return rates.find(
		(r) => r.roomid === roomid && r.roomratetype === type && r.from <= day && r.to >= day
	);
}

/**
 * The rate a new one ends for a room: its rate of that type running when the
 * new one starts, if it runs no longer than the new one. The database does
 * the same when the rate is saved.
 */
export function endedBy(
	rates: RoomRateRow[],
	roomid: number,
	type: RoomRateType,
	from: string,
	to: string
): RoomRateRow | undefined {
	return rates.find(
		(r) =>
			r.roomid === roomid &&
			r.roomratetype === type &&
			r.from < from &&
			r.to >= from &&
			r.to <= to
	);
}

/** What saving a new rate does to the rates running when it starts. */
export function endsLine(
	rates: RoomRateRow[],
	roomids: number[],
	type: RoomRateType,
	from: string,
	to: string
): string | undefined {
	if (!from || !to) return undefined;
	const ended = roomids
		.map((id) => endedBy(rates, id, type, from, to))
		.filter((r): r is RoomRateRow => !!r);
	if (!ended.length) return undefined;
	const day = dateShort(dayBefore(from));
	if (roomids.length === 1) {
		const [r] = ended;
		return `The ${money(r.roomrate)} ${rateLabel(type)} rate from ${dateShort(r.from)} ends on ${day}.`;
	}
	const rooms = `${ended.length} room${ended.length === 1 ? '' : 's'}`;
	return `The running ${rateLabel(type)} rate of ${rooms} ends on ${day}.`;
}

/** The rate a removed one gives back its days to: the room's rate ending the day before it. */
export function runsOnLine(history: RoomRateRow[], removed: RoomRateRow): string | undefined {
	const before = history.find(
		(r) =>
			r.roomrateid !== removed.roomrateid &&
			r.roomratetype === removed.roomratetype &&
			r.to === dayBefore(removed.from)
	);
	return before
		? `The ${money(before.roomrate)} rate from ${dateShort(before.from)} runs on to ${dateShort(removed.to)}.`
		: undefined;
}
