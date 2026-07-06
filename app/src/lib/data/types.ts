// TypeScript shapes for the Yellow Point Lodge `ypl` schema and its report RPCs.
// Table rows preserve the Access-derived column names so this mock layer can be
// swapped for Supabase RPC calls without changing any screen code.

// ---------------------------------------------------------------------------
// Table rows
// ---------------------------------------------------------------------------

export interface Guest {
	guestid: number;
	guestsalutation: string | null;
	guestfirstname: string | null;
	guestlastname: string;
	guestaddress: string | null;
	guestcity: string | null;
	guestregion: string | null;
	guestcountry: string | null;
	guestpczip: string | null;
	guestprimaryphone: string | null;
	guestprimaryphonetype: string | null;
	guestsecondaryphone: string | null;
	guestsecondaryphonetype: string | null;
	guestemailaddress: string | null;
	guestcompany: string | null;
	guestvoid: boolean;
	guestnotes: string | null;
	guestarchive: boolean;
}

export interface Reservation {
	reservationid: number;
	resnumber: number;
	resbookingdate: string | null;
	resbookedby: string;
	resgroupname: string | null;
	resarrivaldate: string;
	resdeparturedate: string;
	numnights: number | null;
	numrooms: number;
	numadults: number;
	numchildren: number | null;
	resconfirmed: boolean;
	resdateconfirmed: string | null;
	rescancelled: boolean;
	resdatecancelled: string | null;
	resnotes: string | null;
	resarchive: boolean;
	resarrivaltime: string | null;
	bedtype: string | null;
}

export interface ReservationGuest {
	reservationguestid: number;
	reservationid: number;
	guestid: number;
	primaryguest: boolean;
	checkindate: string;
	checkintime: string | null;
	checkoutdate: string;
	checkouttime: string | null;
	guestinhouse: boolean;
	percentageofbill: number;
	vehicledescription: string | null;
	vehiclelicenseplate: string | null;
	rgnotes: string | null;
	rgarchive: boolean;
}

export interface RoomAssignment {
	occupancyid: number;
	reservationguestid: number;
	roomid: number;
	occupancyin: string;
	occupancyout: string;
	occupancynumguests: number | null;
	occupancynotes: string | null;
	occupancyarchive: boolean;
}

export interface Transaction {
	transactionid: number;
	reservationguestid: number;
	transdate: string;
	transtype: string;
	inventoryid: number | null;
	roomid: number | null;
	transquantity: number;
	transamount: number | null;
	transgstamount: number | null;
	transpstamount: number | null;
	transhstamount: number | null;
	transltamount: number | null;
	transrtamount: number | null;
	transhtamount: number | null;
	transdmtamount: number | null;
	transnotes: string | null;
	transarchive: boolean;
	occupancyin: string | null;
	occupancyout: string | null;
}

export interface Payment {
	paymentid: number;
	reservationguestid: number;
	paymentcode: string;
	paymentcategory: string;
	paymenttype: string;
	paymentdate: string | null;
	paymentamount: number | null;
	paymentcurrency: string;
	ccname: string | null;
	paymentamountcdn: number | null;
	ccnotes: string | null;
	paymentnotes: string | null;
	paymentarchive: boolean;
}

export interface HousekeepingNote {
	housekeepingnotesid: number;
	reservationguestid: number;
	hknotesdate: string | null;
	housekeepingnotes: string | null;
	hkarchive: boolean;
}

export interface KitchenMeal {
	kitchenmealid: number;
	guestid: number;
	guestdiet: string | null;
	kitchenmealnotes: string | null;
	kmarchive: boolean;
}

export interface Room {
	roomid: number;
	roomnumber: string | null;
	roomname: string | null;
	roomtype: string | null;
	roomcode: string | null;
	roomshorthand: string | null;
	roomgst: boolean;
	roompst: boolean;
	roomhst: boolean;
	roomrt: boolean;
	roomht: boolean;
	roomnotes: string | null;
	roomarchive: boolean;
	roomorder: number | null;
	roomdmt: boolean;
}

export interface InventoryItem {
	inventoryid: number;
	invtype: string;
	invcode: string;
	invitemdescription: string | null;
	invamount: number | null;
	invgst: boolean;
	invpst: boolean;
	invhst: boolean;
	invlt: boolean;
	invrt: boolean;
	invht: boolean;
	invnotes: string | null;
	invarchive: boolean;
	invdmt: boolean;
}

// ---------------------------------------------------------------------------
// Lookup metadata
// ---------------------------------------------------------------------------

export interface PaymentCategory {
	paymentcategory: string;
	paymentcode: string;
	paymentcategoryorder: number;
}
export interface PaymentType {
	paymenttype: string;
	paymenttypeorder: number;
}
export interface TransactionType {
	transactiontype: string;
	transactiontypeorder: number;
}

// ---------------------------------------------------------------------------
// RPC result shapes (one type per `ypl` function the screens call)
// ---------------------------------------------------------------------------

export interface GuestSearchRow {
	guestid: number;
	guest_name: string;
	guestlastname: string;
	guestfirstname: string | null;
	guestcity: string | null;
	guestregion: string | null;
	guestprimaryphone: string | null;
	guestemailaddress: string | null;
}

export interface AllFieldsRow {
	guestid: number | null;
	reservationid: number | null;
	resnumber: number | null;
	guest_name: string;
	matched_on: string;
	detail: string | null;
}

export type DateMode = 'arrivals' | 'departures' | 'both' | 'in_house' | 'occupancy';
export type RangeMode = 'overlap' | 'arrivals' | 'departures' | 'occupancy';

export interface DateSearchRow {
	reservationid: number;
	reservationguestid: number;
	resnumber: number;
	guest_name: string;
	guestlastname: string;
	guestfirstname: string | null;
	room: string | null;
	arrival_date: string;
	departure_date: string;
	match_type: string;
	numnights: number | null;
	pax: number;
	deposit_cdn: number;
	rescancelled: boolean;
}

export interface DateRangeRow {
	reservationid: number;
	resnumber: number;
	guest_name: string;
	arrival_date: string;
	departure_date: string;
	rooms: string | null;
	match_type: string;
}

export interface ReservationSummary {
	reservationid: number;
	resnumber: number;
	resbookingdate: string | null;
	resbookedby: string;
	resgroupname: string | null;
	resarrivaldate: string;
	resdeparturedate: string;
	numnights: number | null;
	numrooms: number;
	numadults: number;
	numchildren: number | null;
	resconfirmed: boolean;
	resdateconfirmed: string | null;
	rescancelled: boolean;
	resdatecancelled: string | null;
	resnotes: string | null;
	resarrivaltime: string | null;
	bedtype: string | null;
	primary_reservationguestid: number;
	primary_guestid: number;
	guest_name: string;
	guestlastname: string;
	guestfirstname: string | null;
	guestaddress: string | null;
	guestcity: string | null;
	guestregion: string | null;
	guestcountry: string | null;
	guestpczip: string | null;
	guestprimaryphone: string | null;
	guestemailaddress: string | null;
	rooms: string | null;
	first_room_in: string | null;
	last_room_out: string | null;
	occupancy_guest_count: number;
	balance_owing: number;
}

export type HistoryBucket = 'future' | 'present' | 'past';
export interface GuestHistoryRow {
	reservationid: number;
	reservationguestid: number;
	resnumber: number;
	bucket: HistoryBucket;
	arrival_date: string;
	departure_date: string;
	rooms: string | null;
	rescancelled: boolean;
	balance_owing: number;
	party_size: number;
	co_guests: string | null;
}

export interface ReservationGuestSummary {
	reservationguestid: number;
	reservationid: number;
	resnumber: number;
	guestid: number;
	primaryguest: boolean;
	checkindate: string;
	checkintime: string | null;
	checkoutdate: string;
	checkouttime: string | null;
	guestinhouse: boolean;
	percentageofbill: number;
	vehicledescription: string | null;
	vehiclelicenseplate: string | null;
	rgnotes: string | null;
	guest_name: string;
	guestlastname: string;
	guestfirstname: string | null;
	balance_owing: number;
}

export interface OccupancySummary {
	occupancyid: number;
	reservationguestid: number;
	reservationid: number;
	resnumber: number;
	guestid: number;
	guest_name: string;
	roomid: number;
	room: string;
	room_compact: string;
	roomname: string | null;
	roomnumber: string | null;
	roomtype: string | null;
	roomshorthand: string | null;
	roomorder: number | null;
	occupancyin: string;
	occupancyout: string;
	occupancynumguests: number | null;
	occupancynotes: string | null;
	status_today: string;
}

export interface LedgerRow {
	line_source: 'transaction' | 'payment';
	line_id: number;
	reservationguestid: number;
	line_date: string;
	line_type: string;
	code: string | null;
	description: string;
	quantity: number;
	amount: number;
	tax_total: number;
	balance_effect: number;
	running_balance: number;
}

// Guest documents
export interface ConfirmationReport {
	resnumber: number;
	guest: string;
	guest_names: string | null;
	guestaddress: string | null;
	guestcity: string | null;
	guestregion: string | null;
	guestcountry: string | null;
	guestpczip: string | null;
	phone: string | null;
	date_printed: string;
	date_confirmed: string | null;
	arrival_date: string;
	departure_date: string;
	room: string | null;
	in_date: string | null;
	out_date: string | null;
	guest_count: number;
	reservation_notes: string | null;
	deposit_amount: number | null;
	deposit_date: string | null;
}

export interface FolioReport {
	resnumber: number;
	guest: string;
	guest_names: string | null;
	guestaddress: string | null;
	guestcity: string | null;
	guestregion: string | null;
	guestcountry: string | null;
	guestpczip: string | null;
	phone: string | null;
	date_printed: string;
	arrival_date: string;
	departure_date: string;
	room: string | null;
	in_date: string | null;
	out_date: string | null;
	guest_count: number;
	deposit_amount: number | null;
	deposit_type: string | null;
	vehicle_description: string | null;
	vehicle_license_plate: string | null;
}

export interface CheckoutBillHeader {
	resnumber: number;
	guest: string;
	guest_names: string | null;
	guestaddress: string | null;
	guestcity: string | null;
	guestregion: string | null;
	guestcountry: string | null;
	guestpczip: string | null;
	phone: string | null;
	date_printed: string;
	arrival_date: string;
	departure_date: string;
	tax_gst: number;
	tax_pst: number;
	tax_hst: number;
	tax_liquor: number;
	tax_room: number;
	tax_hotel: number;
	tax_dmt: number;
	subtotal: number;
	balance_owing: number;
	future_deposit: number;
	gratuity_amount: number;
	grand_total: number;
	gst_registration_number: string;
}

export interface CheckoutBillLine {
	sort_group: 'charges' | 'settlements';
	sort_order: number;
	line_date: string;
	description: string;
	quantity: number;
	unit_price: number | null;
	amount: number;
	kind_label: string;
	display_sign: string;
}

export interface CancellationReport {
	resnumber: number;
	guest: string;
	guestaddress: string | null;
	guestcity: string | null;
	guestregion: string | null;
	guestcountry: string | null;
	guestpczip: string | null;
	phone: string | null;
	date_printed: string;
	date_cancelled: string | null;
	arrival_date: string;
	departure_date: string;
	room: string | null;
	guest_count: number;
	deposit_received_amount: number | null;
	deposit_received_date: string | null;
	deposit_outcome_category: string | null;
	deposit_outcome_amount: number | null;
	deposit_outcome_date: string | null;
	cancellation_notes: string | null;
}

export type GuestDocument =
	| 'confirmation'
	| 'check_in_folio'
	| 'checkout_bill'
	| 'cancellation_notice';

export interface GuestDocumentQueueRow {
	document_type: GuestDocument;
	reservationid: number;
	resnumber: number;
	guest: string;
	target_date: string | null;
	reason: string;
}

// Operational reports
export interface HousekeepingRow {
	status: string;
	resnumber: number;
	guest: string;
	guest_count: number | null;
	room: string;
	in_date: string;
	out_date: string;
	note_date: string | null;
	notes: string | null;
}

export interface InHouseRow {
	section: string;
	resnumber: number;
	guest: string;
	arrival: string | null;
	guest_count: number | null;
	room: string;
	in_date: string;
	out_date: string;
	occupancy_notes: string | null;
}

export interface KitchenMealRow {
	resnumber: number;
	guest: string;
	arrival_date: string;
	departure_date: string;
	diet_notes: string | null;
}

export interface KitchenFilteredRow {
	resnumber: number;
	guestlastname: string;
	guestfirstname: string | null;
	guestdiet: string | null;
	kitchenmealnotes: string | null;
	arrival_date: string;
	departure_date: string;
}

export interface ManualSalesRow {
	room: string;
	resnumber: number;
	guest_last_name: string;
	room_order: number | null;
	is_cancelled: boolean;
}

export interface CancellationListRow {
	resnumber: number;
	guest: string;
	date_cancelled: string;
	arrival_date: string;
	departure_date: string;
	rooms: string | null;
	notes: string | null;
}

// Daily Cash Activity Report
export interface DcarUpperRow {
	group_name: 'Revenue' | 'Taxes' | 'Adjustments';
	item: string;
	amount: number;
	sort_order: number;
}

export interface DcarPaymentRow {
	paymenttype: string;
	calc_amount: number;
	actual_amount: number | null;
	adjustment: number | null;
	sort_order: number;
}

export interface DcarSummary {
	business_date: string;
	upper_total: number;
	receipts_total: number;
	balance_owed: number;
	manual_adjustments_stored: boolean;
	note: string;
}

export interface DepositReportRow {
	payment_type: string;
	resnumber: number;
	guestlastname: string;
	guestfirstname: string | null;
	guest: string;
	pymt_amount: number | null;
	funds: string;
	pymt_cdn: number | null;
}

export interface CashierDetailRow {
	payment_type: string;
	resnumber: number;
	pymt_date: string;
	pymt_category: string;
	amount: number;
	guest: string;
}

export interface ItemsCashedOutRow {
	inv_code: string;
	resnumber: number;
	guestlastname: string;
	guestfirstname: string | null;
	item: string;
	quantity: number;
	total: number;
	gst: number;
	pst: number;
	hst: number;
	dmt: number;
	liquor: number;
	room_tax: number;
	hotel_tax: number;
}
