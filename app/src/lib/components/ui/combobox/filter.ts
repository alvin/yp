export interface ComboboxOption {
	value: string;
	label: string;
	/** Right-aligned detail — a price, a room type. Shown, not searched. */
	hint?: string;
}

/**
 * The options matching what has been typed: a plain case-insensitive substring
 * of the label, with the options that *start* with it listed first — so typing
 * an item-code letter brings that code group to the top. Order is otherwise
 * left as the caller supplied it.
 */
export function filterOptions(options: ComboboxOption[], search: string): ComboboxOption[] {
	const q = search.trim().toLowerCase();
	if (!q) return options;
	const starts: ComboboxOption[] = [];
	const contains: ComboboxOption[] = [];
	for (const option of options) {
		const label = option.label.toLowerCase();
		if (label.startsWith(q)) starts.push(option);
		else if (label.includes(q)) contains.push(option);
	}
	return starts.concat(contains);
}
