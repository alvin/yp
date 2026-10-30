<script lang="ts">
	// A room rate's fields, as on Access's Room form: the rate type (the desk's
	// Double, Single or Split), its code, the price of a night, its dates and
	// notes. The same fields serve one room's rate and a rate for several.
	import type { Snippet } from 'svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Combobox } from '$lib/components/ui/combobox/index.js';
	import { RATE_TYPES } from '$lib/data/reference.js';
	import type { RateForm } from '$lib/admin-rooms.js';
	import type { RateCodeRow, RoomRateType } from '$lib/data/types.js';

	let {
		form = $bindable(),
		codes,
		ends,
		ontype,
		oncode,
		roomsField
	}: {
		form: RateForm;
		codes: RateCodeRow[];
		/** What saving does to the rates running when it starts. */
		ends?: string;
		ontype?: (type: RoomRateType) => void;
		oncode?: (code: string) => void;
		/** The rooms it is for, when it is for several. */
		roomsField?: Snippet;
	} = $props();
</script>

<div class="grid grid-cols-[9rem_1fr] gap-3">
	<div class="space-y-1.5">
		<Label for="rate-type">Rate</Label>
		<Combobox
			id="rate-type"
			bind:value={form.type}
			options={RATE_TYPES}
			onchange={(t) => ontype?.(t as RoomRateType)}
		/>
	</div>
	<div class="space-y-1.5">
		<Label for="rate-code">Rate code</Label>
		<Combobox
			id="rate-code"
			bind:value={form.code}
			options={codes.map((c) => ({
				value: c.roomratecode,
				label: c.description ? `${c.roomratecode} · ${c.description}` : c.roomratecode
			}))}
			placeholder="Choose a code"
			searchPlaceholder="Code or description…"
			onchange={(c) => oncode?.(c)}
		/>
	</div>
</div>
{@render roomsField?.()}
<div class="space-y-1.5">
	<Label for="rate-price">Price per night</Label>
	<Input id="rate-price" type="number" step="0.01" min="0" bind:value={form.price} class="w-36" />
</div>
<div class="grid grid-cols-2 gap-3">
	<div class="space-y-1.5">
		<Label for="rate-from">From</Label>
		<Input id="rate-from" type="date" bind:value={form.from} />
	</div>
	<div class="space-y-1.5">
		<Label for="rate-to">To</Label>
		<Input id="rate-to" type="date" bind:value={form.to} min={form.from} />
	</div>
</div>
{#if ends}
	<p class="text-muted-foreground text-sm">{ends}</p>
{/if}
<div class="space-y-1.5">
	<Label for="rate-notes">Notes</Label>
	<Textarea id="rate-notes" bind:value={form.notes} rows={2} />
</div>
