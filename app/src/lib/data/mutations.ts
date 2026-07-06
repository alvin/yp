// Write layer. Every front-desk action calls one `ypl` workflow RPC; all
// business rules (tax calculation, CDN conversion, reservation numbering,
// deposit handling, the one-year horizon) live in the database, so writes made
// here and writes made directly in Supabase behave identically.

import { supabase, unwrap } from './client';

export interface NewGuestInput {
	lastname: string;
	firstname?: string | null;
	salutation?: string | null;
	address?: string | null;
	city?: string | null;
	region?: string | null;
	country?: string | null;
	pczip?: string | null;
	primaryphone?: string | null;
	primaryphonetype?: string | null;
	secondaryphone?: string | null;
	secondaryphonetype?: string | null;
	email?: string | null;
	company?: string | null;
	notes?: string | null;
}

export async function createGuest(input: NewGuestInput): Promise<number> {
	return unwrap(
		await supabase.rpc('create_guest', {
			p_lastname: input.lastname,
			p_firstname: input.firstname ?? null,
			p_salutation: input.salutation ?? null,
			p_address: input.address ?? null,
			p_city: input.city ?? null,
			p_region: input.region ?? null,
			p_country: input.country ?? null,
			p_pczip: input.pczip ?? null,
			p_primaryphone: input.primaryphone ?? null,
			p_primaryphonetype: input.primaryphonetype ?? null,
			p_secondaryphone: input.secondaryphone ?? null,
			p_secondaryphonetype: input.secondaryphonetype ?? null,
			p_email: input.email ?? null,
			p_company: input.company ?? null,
			p_notes: input.notes ?? null
		})
	);
}

export interface NewReservationInput {
	guestid: number;
	arrival: string;
	departure: string;
	bookedby: string;
	numadults?: number;
	numchildren?: number;
	numrooms?: number;
	bedtype?: string;
	arrivaltime?: string | null;
	groupname?: string | null;
	notes?: string | null;
	roomid?: number | null;
	numguests?: number | null;
}

export interface CreatedReservation {
	reservationid: number;
	resnumber: number;
	reservationguestid: number;
}

export async function createReservation(input: NewReservationInput): Promise<CreatedReservation> {
	const rows = unwrap(
		await supabase.rpc('create_reservation', {
			p_guestid: input.guestid,
			p_arrival: input.arrival,
			p_departure: input.departure,
			p_bookedby: input.bookedby,
			p_numadults: input.numadults ?? 2,
			p_numchildren: input.numchildren ?? 0,
			p_numrooms: input.numrooms ?? 1,
			p_bedtype: input.bedtype ?? 'Double',
			p_arrivaltime: input.arrivaltime ?? null,
			p_groupname: input.groupname ?? null,
			p_notes: input.notes ?? null,
			p_roomid: input.roomid ?? null,
			p_numguests: input.numguests ?? null
		})
	) as CreatedReservation[];
	return rows[0];
}

export async function addReservationGuest(
	reservationid: number,
	guestid: number,
	primaryguest = false
): Promise<number> {
	return unwrap(
		await supabase.rpc('add_reservation_guest', {
			p_reservationid: reservationid,
			p_guestid: guestid,
			p_primaryguest: primaryguest
		})
	);
}

export async function setReservationNotes(reservationid: number, notes: string): Promise<void> {
	unwrap(
		await supabase.rpc('set_reservation_notes', { p_reservationid: reservationid, p_notes: notes })
	);
}

export async function updateReservationGuestNotes(
	reservationguestid: number,
	rgnotes: string
): Promise<void> {
	unwrap(
		await supabase.rpc('update_reservation_guest', {
			p_reservationguestid: reservationguestid,
			p_rgnotes: rgnotes
		})
	);
}

export async function confirmReservation(
	reservationid: number,
	confirmed = true,
	date?: string
): Promise<void> {
	unwrap(
		await supabase.rpc('confirm_reservation', {
			p_reservationid: reservationid,
			p_confirmed: confirmed,
			...(date ? { p_date: date } : {})
		})
	);
}

export async function cancelReservation(
	reservationid: number,
	date: string,
	depositHandling: 'none' | 'refund' | 'keep',
	notes?: string | null
): Promise<void> {
	unwrap(
		await supabase.rpc('cancel_reservation', {
			p_reservationid: reservationid,
			p_date: date,
			p_deposit_handling: depositHandling,
			p_notes: notes ?? null
		})
	);
}

export async function rebookReservation(
	reservationid: number,
	arrival: string,
	departure: string,
	bookedby: string
): Promise<{ reservationid: number; resnumber: number }> {
	const rows = unwrap(
		await supabase.rpc('rebook_reservation', {
			p_reservationid: reservationid,
			p_arrival: arrival,
			p_departure: departure,
			p_bookedby: bookedby
		})
	) as { reservationid: number; resnumber: number }[];
	return rows[0];
}

// --- Rooms -------------------------------------------------------------------

export async function assignRoom(
	reservationguestid: number,
	roomid: number,
	occupancyin: string,
	occupancyout: string,
	numguests?: number | null,
	notes?: string | null
): Promise<number> {
	return unwrap(
		await supabase.rpc('assign_room', {
			p_reservationguestid: reservationguestid,
			p_roomid: roomid,
			p_occupancyin: occupancyin,
			p_occupancyout: occupancyout,
			p_numguests: numguests ?? null,
			p_notes: notes ?? null
		})
	);
}

export async function recordRoomMove(
	occupancyid: number,
	newRoomid: number,
	moveDate: string,
	notes?: string | null
): Promise<number> {
	return unwrap(
		await supabase.rpc('record_room_move', {
			p_occupancyid: occupancyid,
			p_new_roomid: newRoomid,
			p_move_date: moveDate,
			p_notes: notes ?? null
		})
	);
}

// --- Charges and payments ------------------------------------------------------

export async function postRoomNights(
	reservationguestid: number,
	roomid: number,
	occupancyin: string,
	occupancyout: string,
	rate: number | null,
	transdate: string,
	notes?: string | null
): Promise<number> {
	return unwrap(
		await supabase.rpc('post_room_nights', {
			p_reservationguestid: reservationguestid,
			p_roomid: roomid,
			p_occupancyin: occupancyin,
			p_occupancyout: occupancyout,
			p_rate: rate,
			p_transdate: transdate,
			p_notes: notes ?? null
		})
	);
}

export async function postCharge(
	reservationguestid: number,
	inventoryid: number,
	quantity: number,
	transdate: string,
	amount: number | null,
	transtype: string | null,
	notes?: string | null
): Promise<number> {
	return unwrap(
		await supabase.rpc('post_charge', {
			p_reservationguestid: reservationguestid,
			p_inventoryid: inventoryid,
			p_quantity: quantity,
			p_transdate: transdate,
			p_amount: amount,
			p_transtype: transtype,
			p_notes: notes ?? null
		})
	);
}

export async function recordPayment(
	reservationguestid: number,
	paymentcategory: string,
	paymenttype: string,
	amount: number,
	currency: string,
	paymentdate: string,
	notes?: string | null
): Promise<number> {
	return unwrap(
		await supabase.rpc('record_payment', {
			p_reservationguestid: reservationguestid,
			p_paymentcategory: paymentcategory,
			p_paymenttype: paymenttype,
			p_amount: amount,
			p_currency: currency,
			p_paymentdate: paymentdate,
			p_notes: notes ?? null
		})
	);
}

export async function sellGiftCertificate(
	reservationguestid: number,
	amount: number,
	paymenttype: string,
	date: string,
	notes?: string | null
): Promise<number> {
	return unwrap(
		await supabase.rpc('sell_gift_certificate', {
			p_reservationguestid: reservationguestid,
			p_amount: amount,
			p_paymenttype: paymenttype,
			p_date: date,
			p_notes: notes ?? null
		})
	);
}

// --- Notes ---------------------------------------------------------------------

export async function addHousekeepingNote(
	reservationguestid: number,
	notes: string,
	date: string
): Promise<number> {
	return unwrap(
		await supabase.rpc('add_housekeeping_note', {
			p_reservationguestid: reservationguestid,
			p_notes: notes,
			p_date: date
		})
	);
}

export async function saveKitchenMeal(
	guestid: number,
	guestdiet: string,
	notes?: string | null,
	kitchenmealid?: number | null
): Promise<number> {
	return unwrap(
		await supabase.rpc('save_kitchen_meal', {
			p_guestid: guestid,
			p_guestdiet: guestdiet,
			p_notes: notes ?? null,
			p_kitchenmealid: kitchenmealid ?? null
		})
	);
}

export async function setGuestNotes(guestid: number, notes: string): Promise<void> {
	unwrap(await supabase.rpc('set_guest_notes', { p_guestid: guestid, p_notes: notes }));
}
