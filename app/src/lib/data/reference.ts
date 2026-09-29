// Reference / configuration data, loaded once per session from the `ypl`
// lookup, room and inventory tables. The database is the source
// of truth: edits made in Supabase show up here on the next app load.

import { supabase, unwrap } from './client';
import { sortItemsByCode } from '../inventory';
import type { InventoryItem, PaymentCategory, PaymentType, Room } from './types';

/** The lodge's number, as the guest documents print it. */
export const LODGE_PHONE = '(250) 245-7422';

// Access column comment: "Bed Type is always either Double or Twin." Not every
// room at the lodge has two beds to choose between, so the front desk reads the
// choice as how the beds in the room are made up. The stored vocabulary is left
// alone — the Access import and direct Supabase edits both speak it — and only
// the label the clerk reads changes.
export const BED_TYPES: { value: string; label: string }[] = [
	{ value: 'Double', label: 'Regular' },
	{ value: 'Twin', label: 'Split' }
];

export function bedTypeLabel(value: string | null | undefined): string {
	if (!value) return '';
	return BED_TYPES.find((b) => b.value === value)?.label ?? value;
}

// Tender types the lodge takes. US variants stay in the database for the
// records that carry them and for the daily cash report; they are not offered.
const HIDDEN_TENDER_PREFIX = 'U.S.';

// Populated by loadReference(); exported arrays are filled in place so every
// importer sees the loaded data.
export const SALUTATIONS: string[] = [];
export const GUEST_DIETS: string[] = [];
export const PAYMENT_CATEGORIES: PaymentCategory[] = [];
export const PAYMENT_TYPES: PaymentType[] = [];
export const ROOMS: Room[] = [];
export const INVENTORY_ITEMS: InventoryItem[] = [];

function fill<T>(target: T[], values: T[]): void {
	target.splice(0, target.length, ...values);
}

let loaded = false;

/** Loads all reference data. Called once from the root layout after sign-in. */
export async function loadReference(): Promise<void> {
	if (loaded) return;
	const [salutations, diets, payCats, payTypes, rooms, inventory] =
		await Promise.all([
			supabase.from('lookup_salutations').select('salutation').order('salutation').then(unwrap),
			supabase.from('lookup_guest_diets').select('guestdiet').order('guestdiet').then(unwrap),
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
				.order('invcode')
				.then(unwrap)
		]);

	fill(SALUTATIONS, (salutations as { salutation: string }[]).map((r) => r.salutation));
	fill(GUEST_DIETS, (diets as { guestdiet: string }[]).map((r) => r.guestdiet));
	fill(PAYMENT_CATEGORIES, payCats as PaymentCategory[]);
	fill(
		PAYMENT_TYPES,
		(payTypes as PaymentType[]).filter((t) => !t.paymenttype.startsWith(HIDDEN_TENDER_PREFIX))
	);
	fill(ROOMS, rooms as Room[]);
	// Item-code order — the order the front desk reads the price list in, and
	// the order the charge-item picker presents.
	fill(INVENTORY_ITEMS, sortItemsByCode(inventory as InventoryItem[]));

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
