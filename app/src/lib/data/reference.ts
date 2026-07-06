// Reference / configuration data, loaded once per session from the `ypl`
// lookup, room, inventory, tax and exchange tables. The database is the source
// of truth: edits made in Supabase show up here on the next app load.

import { supabase, unwrap } from './client';
import type {
	InventoryItem,
	PaymentCategory,
	PaymentType,
	Room,
	TransactionType
} from './types';

export const LODGE = {
	name: 'Yellow Point Lodge',
	phone: '(250) 245-7422',
	address: '3700 Yellow Point Rd',
	city: 'Ladysmith',
	region: 'BC',
	country: 'CAN',
	postal: 'V9G 1E5',
	gstRegistration: 'R1105763445'
};

// Access column comment: "Bed Type is always either Double or Twin."
export const BED_TYPES = ['Double', 'Twin'];

export const PAYMENT_CURRENCIES = ['Canadian', 'US'];

// Populated by loadReference(); exported arrays are filled in place so every
// importer sees the loaded data.
export const SALUTATIONS: string[] = [];
export const GUEST_DIETS: string[] = [];
export const ROOM_TYPES: string[] = [];
export const TRANSACTION_TYPES: TransactionType[] = [];
export const PAYMENT_CATEGORIES: PaymentCategory[] = [];
export const PAYMENT_TYPES: PaymentType[] = [];
export const ROOMS: Room[] = [];
export const INVENTORY_ITEMS: InventoryItem[] = [];

export let CURRENT_EXCHANGE_RATE = 1.0;

export const CURRENT_TAX_RATES = {
	gst: 0,
	pst: 0,
	hst: 0,
	liquor: 0,
	room: 0,
	hotel: 0,
	dmt: 0
};

function fill<T>(target: T[], values: T[]): void {
	target.splice(0, target.length, ...values);
}

let loaded = false;

/** Loads all reference data. Called once from the root layout after sign-in. */
export async function loadReference(): Promise<void> {
	if (loaded) return;
	const today = new Date().toLocaleDateString('en-CA');

	const [salutations, diets, roomTypes, transTypes, payCats, payTypes, rooms, inventory, taxes, exchange] =
		await Promise.all([
			supabase.from('lookup_salutations').select('salutation').order('salutation').then(unwrap),
			supabase.from('lookup_guest_diets').select('guestdiet').order('guestdiet').then(unwrap),
			supabase.from('lookup_room_types').select('roomtype').then(unwrap),
			supabase
				.from('lookup_transaction_types')
				.select('*')
				.order('transactiontypeorder')
				.then(unwrap),
			supabase
				.from('lookup_payment_categories')
				.select('*')
				.order('paymentcategoryorder')
				.then(unwrap),
			supabase.from('lookup_payment_types').select('*').order('paymenttypeorder').then(unwrap),
			supabase
				.from('rooms')
				.select('*')
				.eq('roomarchive', false)
				.order('roomorder')
				.then(unwrap),
			supabase
				.from('inventory_items')
				.select('*')
				.eq('invarchive', false)
				.order('invtype')
				.order('invitemdescription')
				.then(unwrap),
			supabase
				.from('tax_rates')
				.select('taxratetype, taxrate, taxratestartdate')
				.eq('taxratearchive', false)
				.lte('taxratestartdate', today)
				.gte('taxrateenddate', today)
				.order('taxratestartdate', { ascending: false })
				.then(unwrap),
			supabase
				.from('exchange_rates')
				.select('exchangerate, exchangeratestartdate')
				.eq('exchangeratearchive', false)
				.lte('exchangeratestartdate', today)
				.order('exchangeratestartdate', { ascending: false })
				.limit(1)
				.then(unwrap)
		]);

	fill(SALUTATIONS, (salutations as { salutation: string }[]).map((r) => r.salutation));
	fill(GUEST_DIETS, (diets as { guestdiet: string }[]).map((r) => r.guestdiet));
	fill(ROOM_TYPES, (roomTypes as { roomtype: string }[]).map((r) => r.roomtype));
	fill(TRANSACTION_TYPES, transTypes as TransactionType[]);
	fill(PAYMENT_CATEGORIES, payCats as PaymentCategory[]);
	fill(PAYMENT_TYPES, payTypes as PaymentType[]);
	fill(ROOMS, rooms as Room[]);
	fill(INVENTORY_ITEMS, inventory as InventoryItem[]);

	const taxByType: Record<string, number> = {};
	for (const t of taxes as { taxratetype: string; taxrate: number }[]) {
		// Rows are newest-first; keep the first (most recent) rate per type.
		if (!(t.taxratetype in taxByType)) taxByType[t.taxratetype] = Number(t.taxrate);
	}
	CURRENT_TAX_RATES.gst = taxByType['GST'] ?? 0;
	CURRENT_TAX_RATES.pst = taxByType['PST'] ?? 0;
	CURRENT_TAX_RATES.hst = taxByType['HST'] ?? 0;
	CURRENT_TAX_RATES.liquor = taxByType['Liquor'] ?? 0;
	CURRENT_TAX_RATES.room = taxByType['Room'] ?? 0;
	CURRENT_TAX_RATES.hotel = taxByType['Hotel'] ?? 0;
	CURRENT_TAX_RATES.dmt = taxByType['DMT'] ?? 0;

	const ex = (exchange as { exchangerate: number }[])[0];
	if (ex) CURRENT_EXCHANGE_RATE = Number(ex.exchangerate);

	loaded = true;
}

export function roomById(roomid: number): Room | undefined {
	return ROOMS.find((r) => r.roomid === roomid);
}

/** Room option label for pickers: "Lodge 04 — Q · Lodge Room". */
export function roomOptionLabel(r: Room): string {
	const head = r.roomname + (r.roomnumber ? ` ${r.roomnumber}` : '');
	const bed = r.roomshorthand ? ` — ${r.roomshorthand}` : '';
	return `${head}${bed} · ${r.roomtype}`;
}

export function inventoryById(id: number): InventoryItem | undefined {
	return INVENTORY_ITEMS.find((i) => i.inventoryid === id);
}

// Maps an inventory item's type to the DCAR transaction-type bucket it posts to.
export const INV_TYPE_TO_TRANSTYPE: Record<string, string> = {
	'Red Wine': 'Liquor',
	'White Wine': 'Liquor',
	'Beer and Cider': 'Liquor',
	Liqueurs: 'Liquor',
	'Beauty Services': 'Beauty Services',
	Shuttle: 'Shuttle Service',
	'Shirts and Clothing': 'Hats/Shirts',
	Sundries: 'Sundries',
	'Gift Certificate': 'Gift Certificate',
	Miscellaneous: 'Misc.'
};
