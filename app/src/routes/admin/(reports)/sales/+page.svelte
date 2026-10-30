<script lang="ts">
	// Items Cashed Out over a range of days. All items is the whole report;
	// Selected lists only the items chosen in the bar under the tabs. Ticking a
	// type ticks every item of that type, which can then be cleared one by one:
	// all the garments without the hats. What is chosen is always among the
	// items sold in the dates, so new dates drop an item they didn't sell.
	import { goto, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import XIcon from '@lucide/svelte/icons/x';
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import ReportDateInput from '$lib/components/app/report-date-input.svelte';
	import ItemsCashedOutBody from '$lib/components/reports/items-cashed-out-body.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import HelpSheet from '$lib/components/app/help-sheet.svelte';
	import { HELP } from '$lib/admin-help.js';
	import { Combobox, type ComboboxOption } from '$lib/components/ui/combobox/index.js';
	import { salesQuery } from '$lib/admin.js';
	import { dateShort } from '$lib/format.js';

	let { data } = $props();

	const OTHER = 'Other';
	const typeOf = (t: string | null) => t ?? OTHER;
	const byCode = (a: string, b: string) =>
		a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true });

	// The items and types sold in the dates, each with how many.
	const items = $derived.by(() => {
		const out = new Map<string, { code: string; item: string; type: string; quantity: number }>();
		for (const r of data.rows) {
			const known = out.get(r.inv_code);
			if (known) known.quantity += r.quantity;
			else
				out.set(r.inv_code, {
					code: r.inv_code,
					item: r.item,
					type: typeOf(r.inv_type),
					quantity: r.quantity
				});
		}
		return [...out.values()].sort(
			(a, b) =>
				(a.type === OTHER ? 1 : 0) - (b.type === OTHER ? 1 : 0) ||
				a.type.localeCompare(b.type) ||
				byCode(a.code, b.code)
		);
	});
	const types = $derived([...new Set(items.map((i) => i.type))]);
	const codesOf = (type: string) => items.filter((i) => i.type === type).map((i) => i.code);

	const itemOptions = $derived<ComboboxOption[]>(
		items.map((i) => ({
			value: i.code,
			label: i.code ? `${i.code} · ${i.item}` : i.item,
			hint: String(i.quantity),
			group: i.type
		}))
	);
	const typeOptions = $derived<ComboboxOption[]>(
		types.map((t) => ({
			value: t,
			label: t,
			hint: String(items.filter((i) => i.type === t).reduce((s, i) => s + i.quantity, 0))
		}))
	);

	// The choice, kept in the address without reloading the report.
	const chosen = new SvelteSet<string>(untrack(() => data.codes));
	$effect.pre(() => {
		const sold = new Set(items.map((i) => i.code));
		untrack(() => {
			const gone = [...chosen].filter((c) => !sold.has(c));
			if (gone.length) tick(gone, false);
		});
	});
	const fullTypes = $derived(types.filter((t) => codesOf(t).every((c) => chosen.has(c))));
	const partTypes = $derived(
		types.filter((t) => !fullTypes.includes(t) && codesOf(t).some((c) => chosen.has(c)))
	);

	function remember() {
		replaceState(`/admin/sales?${salesQuery(data.from, data.to, data.view, [...chosen])}`, page.state);
	}
	function tick(codes: string[], on: boolean) {
		for (const c of codes) {
			if (on) chosen.add(c);
			else chosen.delete(c);
		}
		remember();
	}
	const tickTypes = (picked: string[], on: boolean) => tick(picked.flatMap(codesOf), on);
	const clear = () => tick([...chosen], false);

	function typesText(full: ComboboxOption[], part: ComboboxOption[]): string {
		if (full.length === typeOptions.length) return 'All types';
		const named = [...full, ...part];
		if (named.length > 1) return `${named.length} types`;
		return part.length ? `Part of ${named[0].label}` : named[0].label;
	}
	function itemsText(picked: ComboboxOption[]): string {
		if (picked.length === itemOptions.length) return 'All items';
		if (picked.length === 1) return picked[0].label;
		return `${picked.length} of ${itemOptions.length} items`;
	}

	const rows = $derived(
		data.view === 'all' ? data.rows : data.rows.filter((r) => chosen.has(r.inv_code))
	);

	function changeRange(from: string, to: string) {
		goto(`/admin/sales?${salesQuery(from, to, data.view, [...chosen])}`);
	}

	const tabs = $derived([
		{
			label: 'All items',
			href: `/admin/sales?${salesQuery(data.from, data.to, 'all', [...chosen])}`,
			current: data.view === 'all'
		},
		{
			label: 'Selected',
			href: `/admin/sales?${salesQuery(data.from, data.to, 'selected', [...chosen])}`,
			current: data.view === 'selected'
		}
	]);
</script>

<svelte:head
	><title>Items cashed out · {dateShort(data.from)}–{dateShort(data.to)}</title></svelte:head
>

{#snippet filters()}
	<label class="text-muted-foreground text-xs" for="sales-types">Item types</label>
	<Combobox
		id="sales-types"
		multiple
		values={fullTypes}
		mixed={partTypes}
		options={typeOptions}
		placeholder="Choose…"
		searchPlaceholder="Item type…"
		summary={typesText}
		ontoggle={tickTypes}
		class="h-8 w-60"
	/>
	<label class="text-muted-foreground text-xs" for="sales-items">Items</label>
	<Combobox
		id="sales-items"
		multiple
		values={[...chosen]}
		options={itemOptions}
		placeholder="Choose…"
		searchPlaceholder="Item code or name…"
		summary={itemsText}
		ontoggle={tick}
		class="h-8 w-72"
	/>
	{#if chosen.size}
		<Button variant="ghost" size="sm" onclick={clear}><XIcon /> Clear</Button>
	{/if}
{/snippet}

<ReportShell
	title="Items Cashed Out — {dateShort(data.from)} to {dateShort(data.to)}"
	orientation="landscape"
	{tabs}
	bar={data.view === 'selected' ? filters : undefined}
>
	{#snippet toolbar()}
		<ReportDateInput
			id="sales-from"
			label="From"
			value={data.from}
			onchange={(from) => changeRange(from, data.to)}
		/>
		<ReportDateInput
			id="sales-to"
			label="To"
			value={data.to}
			onchange={(to) => changeRange(data.from, to)}
		/>
		<HelpSheet help={HELP.sales} class="size-8" />
	{/snippet}
	<div class="blackbar">Yellow Point Lodge</div>
	<h1>Items Cashed Out</h1>
	<h3>from {dateShort(data.from)} to {dateShort(data.to)}, by Inventory Code</h3>
	<ItemsCashedOutBody
		{rows}
		showDate
		empty={data.view === 'selected' && !chosen.size
			? 'No items chosen.'
			: 'No charge lines on these dates.'}
	/>
</ReportShell>
