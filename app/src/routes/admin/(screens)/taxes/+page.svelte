<script lang="ts">
	// Every dated rate of the lodge's five taxes, newest first under each tax,
	// as Access listed them. A line opens its rate in the drawer; Add rate
	// enters a new one, ahead of time if need be.
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import PercentIcon from '@lucide/svelte/icons/percent';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Combobox } from '$lib/components/ui/combobox/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import FormSheet from '$lib/components/app/form-sheet.svelte';
	import RateStatusBadge from '$lib/components/app/rate-status-badge.svelte';
	import RemoveRateDialog from '$lib/components/admin/remove-rate-dialog.svelte';
	import HelpSheet from '$lib/components/app/help-sheet.svelte';
	import { HELP } from '$lib/admin-help.js';
	import {
		TAXES,
		dayBefore,
		percent,
		rateEnded,
		rateStatus,
		taxName
	} from '$lib/admin.js';
	import { TODAY } from '$lib/data/queries.js';
	import { removeTaxRate, saveTaxRate } from '$lib/data/mutations.js';
	import { dateShort } from '$lib/format.js';
	import { errorMessage } from '$lib/utils.js';
	import type { TaxRateRow } from '$lib/data/types.js';

	let { data } = $props();

	const groups = $derived(
		TAXES.map((t) => ({ ...t, rates: data.rates.filter((r) => r.taxratetype === t.type) }))
	);

	// ---- The drawer -------------------------------------------------------

	let open = $state(false);
	let saving = $state(false);
	let editing = $state<TaxRateRow | null>(null);
	let form = $state<{ type: string; rate: string | number; from: string; to: string; notes: string }>({
		type: '',
		rate: '',
		from: '',
		to: '',
		notes: ''
	});

	function edit(r: TaxRateRow) {
		editing = r;
		form = {
			type: r.taxratetype,
			rate: String(percent(r.taxrate)),
			from: r.from,
			to: r.to,
			notes: r.notes ?? ''
		};
		open = true;
	}

	function add() {
		editing = null;
		form = { type: '', rate: '', from: TODAY, to: '', notes: '' };
		open = true;
	}

	// A new rate's To starts where the rate it takes over from ends.
	function chooseType(type: string) {
		const running = data.rates.find(
			(r) => r.taxratetype === type && r.from <= form.from && r.to >= form.from
		);
		if (!form.to && running) form.to = running.to;
	}

	const ends = $derived(
		!editing && form.type && form.from && form.to
			? rateEnded(
					data.rates.filter((r) => r.taxratetype === form.type),
					form.from,
					form.to
				)
			: undefined
	);

	const canSave = $derived(
		!!form.type && String(form.rate).trim() !== '' && !!form.from && !!form.to
	);

	async function save() {
		saving = true;
		const pct = Number(form.rate);
		try {
			await saveTaxRate({
				taxrateid: editing?.taxrateid ?? null,
				taxratetype: form.type,
				taxrate: pct / 100,
				from: form.from,
				to: form.to,
				notes: form.notes
			});
			open = false;
			toast.success(`${editing ? 'Saved' : 'Added'} ${taxName(form.type)} at ${pct}%`);
			await invalidateAll();
		} catch (e) {
			toast.error(errorMessage(e, 'Could not save the rate.'));
		} finally {
			saving = false;
		}
	}

	// A rate can be removed until the day it starts; the rate it ended, the one
	// ending the day before it, runs on over its days again.
	let removing = $state(false);
	const runsOn = $derived.by(() => {
		if (!editing) return undefined;
		const r = editing;
		const before = data.rates.find(
			(x) => x.taxratetype === r.taxratetype && x.to === dayBefore(r.from)
		);
		return before
			? `The ${percent(before.taxrate)}% rate from ${dateShort(before.from)} runs on to ${dateShort(r.to)}.`
			: undefined;
	});

	async function remove() {
		if (!editing) return;
		saving = true;
		try {
			await removeTaxRate(editing.taxrateid);
			removing = false;
			open = false;
			toast.success(`Removed ${taxName(editing.taxratetype)} at ${percent(editing.taxrate)}%`);
			await invalidateAll();
		} catch (e) {
			toast.error(errorMessage(e, 'Could not remove the rate.'));
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>Taxes · Admin · Yellow Point Lodge</title></svelte:head>

<div class="mb-5 flex flex-wrap items-end justify-between gap-3">
	<h1 class="flex items-center gap-2 text-xl font-semibold">
		<PercentIcon class="size-5" /> Taxes
	</h1>
	<div class="flex items-center gap-2">
		<Button onclick={add}><PlusIcon /> Add rate</Button>
		<HelpSheet help={HELP.taxes} />
	</div>
</div>

<Card.Root class="py-0">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="pl-4">Tax</Table.Head>
				<Table.Head class="text-right">Rate</Table.Head>
				<Table.Head>From</Table.Head>
				<Table.Head>To</Table.Head>
				<Table.Head></Table.Head>
				<Table.Head class="w-8"></Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each groups as g (g.type)}
				{#each g.rates as r, i (r.taxrateid)}
					<Table.Row
						class="cursor-pointer {rateStatus(r.from, r.to) === 'past' ? 'text-muted-foreground' : ''}"
						onclick={() => edit(r)}
					>
						<Table.Cell class="pl-4 font-medium">{i === 0 ? g.name : ''}</Table.Cell>
						<Table.Cell class="text-right tabular-nums">{percent(r.taxrate)}%</Table.Cell>
						<Table.Cell class="tabular-nums">{dateShort(r.from)}</Table.Cell>
						<Table.Cell class="tabular-nums">{dateShort(r.to)}</Table.Cell>
						<Table.Cell><RateStatusBadge from={r.from} to={r.to} /></Table.Cell>
						<Table.Cell><ChevronRightIcon class="text-muted-foreground size-4" /></Table.Cell>
					</Table.Row>
				{/each}
			{/each}
		</Table.Body>
	</Table.Root>
</Card.Root>

<FormSheet
	bind:open
	title={editing ? `${taxName(editing.taxratetype)} rate` : 'New tax rate'}
	saveLabel={editing ? 'Save rate' : 'Add rate'}
	{saving}
	{canSave}
	onsave={save}
>
	{#if !editing}
		<div class="space-y-1.5">
			<Label for="tax-type">Tax</Label>
			<Combobox
				id="tax-type"
				bind:value={form.type}
				options={TAXES.map((t) => ({ value: t.type, label: t.name }))}
				placeholder="Choose a tax"
				onchange={chooseType}
			/>
		</div>
	{/if}
	<div class="space-y-1.5">
		<Label for="tax-rate">Rate (%)</Label>
		<Input id="tax-rate" type="number" step="0.001" min="0" bind:value={form.rate} class="w-32" />
	</div>
	<div class="grid grid-cols-2 gap-3">
		<div class="space-y-1.5">
			<Label for="tax-from">From</Label>
			<Input id="tax-from" type="date" bind:value={form.from} />
		</div>
		<div class="space-y-1.5">
			<Label for="tax-to">To</Label>
			<Input id="tax-to" type="date" bind:value={form.to} min={form.from} />
		</div>
	</div>
	{#if ends}
		<p class="text-muted-foreground text-sm">
			The {percent(ends.taxrate)}% rate from {dateShort(ends.from)} ends on {dateShort(dayBefore(form.from))}.
		</p>
	{/if}
	<div class="space-y-1.5">
		<Label for="tax-notes">Notes</Label>
		<Textarea id="tax-notes" bind:value={form.notes} rows={2} />
	</div>
	{#snippet action()}
		{#if editing && editing.from >= TODAY}
			<Button variant="ghost" class="text-destructive" onclick={() => (removing = true)} disabled={saving}
				>Remove</Button
			>
		{/if}
	{/snippet}
</FormSheet>

{#if editing}
	<RemoveRateDialog
		bind:open={removing}
		label={taxName(editing.taxratetype)}
		amount="{percent(editing.taxrate)}%"
		detail="{dateShort(editing.from)} to {dateShort(editing.to)}"
		{runsOn}
		removing={saving}
		onremove={remove}
	/>
{/if}
