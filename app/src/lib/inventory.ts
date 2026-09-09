// The lodge's "items to be charged" list.
//
// Front desk works from the item codes on the price list — 'L…' for liquor,
// 'X…' for sundries, 'S…' for clothing — so items are listed in code order and
// labelled code-first, which is what the dropdown's search narrows on.

import type { InventoryItem } from './data/types.js';

/** "L49 · Quails Gate Pinot Noir" — how an item reads in every picker. */
export function itemLabel(i: InventoryItem): string {
	const description = i.invitemdescription?.trim() || i.invtype?.trim() || 'Item';
	return `${i.invcode} · ${description}`;
}

/**
 * Item-code order, case-insensitively and with numbers read as numbers, so
 * L9 sorts before L49 and the letter groups stay together regardless of how
 * the database happens to collate.
 */
function compareByCode(a: InventoryItem, b: InventoryItem): number {
	return (
		a.invcode.localeCompare(b.invcode, 'en', { sensitivity: 'base', numeric: true }) ||
		a.inventoryid - b.inventoryid
	);
}

export function sortItemsByCode(items: InventoryItem[]): InventoryItem[] {
	return [...items].sort(compareByCode);
}
