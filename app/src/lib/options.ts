// Dropdown option lists, built from the reference data loaded at sign-in.
// Called at render time — the reference tables are loaded by the root layout
// before any screen mounts.

import type { ComboboxOption } from './components/ui/combobox/index.js';
import {
	BED_TYPES,
	INVENTORY_ITEMS,
	PAYMENT_CATEGORIES,
	PAYMENT_TYPES,
	ROOMS,
	roomOptionLabel
} from './data/reference.js';
import { itemLabel } from './inventory.js';
import { money } from './format.js';

/** Plain lookup values — salutations, diets. */
export function textOptions(values: string[]): ComboboxOption[] {
	return values.map((v) => ({ value: v, label: v }));
}

/** How the beds in the room are made up, in the lodge's words. */
export function bedTypeOptions(): ComboboxOption[] {
	return BED_TYPES.map((b) => ({ value: b.value, label: b.label }));
}

/** Every active room, in lodge order. */
export function roomOptions(): ComboboxOption[] {
	return ROOMS.map((r) => ({ value: String(r.roomid), label: roomOptionLabel(r) }));
}

/** The items to be charged, in item-code order, with their list prices. */
export function itemOptions(): ComboboxOption[] {
	return INVENTORY_ITEMS.map((i) => ({
		value: String(i.inventoryid),
		label: itemLabel(i),
		hint: money(i.invamount)
	}));
}

/** What a receipt is filed as — a deposit, a regular payment, a refund. */
export function paymentCategoryOptions(): ComboboxOption[] {
	return textOptions(PAYMENT_CATEGORIES.map((c) => c.paymentcategory));
}

/** How the money was tendered. */
export function tenderTypeOptions(): ComboboxOption[] {
	return textOptions(PAYMENT_TYPES.map((t) => t.paymenttype));
}
