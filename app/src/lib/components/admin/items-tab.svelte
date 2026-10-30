<script lang="ts">
	// The items the lodge charges for. A line opens the item in the drawer;
	// Add item fills in a new one. An item is disabled rather than deleted,
	// sold or not: it leaves the charge picker, and its old charges keep
	// naming it.
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Combobox } from '$lib/components/ui/combobox/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import FormSheet from '$lib/components/app/form-sheet.svelte';
	import TaxChecks from './tax-checks.svelte';
	import { saveInventoryItem } from '$lib/data/mutations.js';
	import { money } from '$lib/format.js';
	import { errorMessage } from '$lib/utils.js';
	import type { InventoryItem, ItemTypeRow } from '$lib/data/types.js';

	let { items, types }: { items: InventoryItem[]; types: ItemTypeRow[] } = $props();

	type Tax = 'invgst' | 'invpst' | 'invlt' | 'invrt' | 'invdmt';
	const TAXES: { key: Tax; label: string }[] = [
		{ key: 'invgst', label: 'GST' },
		{ key: 'invpst', label: 'PST' },
		{ key: 'invlt', label: 'Liquor Tax' },
		{ key: 'invrt', label: 'Room Tax' },
		{ key: 'invdmt', label: 'DMT' }
	];
	const SHORT: Record<Tax, string> = {
		invgst: 'GST',
		invpst: 'PST',
		invlt: 'Liquor',
		invrt: 'Room',
		invdmt: 'DMT'
	};

	let search = $state('');
	let showDisabled = $state(false);

	const shown = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return items.filter(
			(i) =>
				(showDisabled || !i.invarchive) &&
				(!q ||
					[i.invcode, i.invitemdescription, i.invtype].some((v) => v?.toLowerCase().includes(q)))
		);
	});

	// ---- The drawer -------------------------------------------------------

	let open = $state(false);
	let saving = $state(false);
	let editing = $state<InventoryItem | null>(null);
	let form = $state(blank());

	function blank() {
		return {
			code: '',
			description: '',
			type: '',
			price: '' as string | number,
			notes: '',
			taxes: { invgst: false, invpst: false, invlt: false, invrt: false, invdmt: false } as Record<
				Tax,
				boolean | null
			>
		};
	}

	function edit(i: InventoryItem) {
		editing = i;
		form = {
			code: i.invcode.trim(),
			description: i.invitemdescription ?? '',
			type: i.invtype ?? '',
			price: i.invamount == null ? '' : String(i.invamount),
			notes: i.invnotes ?? '',
			taxes: { invgst: i.invgst, invpst: i.invpst, invlt: i.invlt, invrt: i.invrt, invdmt: i.invdmt }
		};
		open = true;
	}

	function add() {
		editing = null;
		form = blank();
		open = true;
	}

	async function save(active = editing ? !editing.invarchive : true) {
		saving = true;
		const code = form.code.trim();
		try {
			await saveInventoryItem({
				inventoryid: editing?.inventoryid ?? null,
				invcode: code,
				invitemdescription: form.description.trim() || null,
				invtype: form.type || null,
				invamount: String(form.price).trim() === '' ? null : Number(form.price),
				invgst: form.taxes.invgst === true,
				invpst: form.taxes.invpst === true,
				invlt: form.taxes.invlt === true,
				invrt: form.taxes.invrt === true,
				invdmt: form.taxes.invdmt === true,
				invnotes: form.notes,
				active
			});
			open = false;
			const was = editing ? !editing.invarchive : true;
			toast.success(
				!editing ? `Added ${code}` : active !== was ? `${active ? 'Enabled' : 'Disabled'} ${code}` : `Saved ${code}`
			);
			await invalidateAll();
		} catch (e) {
			toast.error(errorMessage(e, 'Could not save the item.'));
		} finally {
			saving = false;
		}
	}
</script>

<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
	<Input bind:value={search} placeholder="Search…" class="h-9 w-64" aria-label="Search items" />
	<div class="flex items-center gap-3">
		<label class="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm">
			<input type="checkbox" class="accent-primary size-4" bind:checked={showDisabled} />
			Show disabled
		</label>
		<Button onclick={add}><PlusIcon /> Add item</Button>
	</div>
</div>

<div class="bg-card overflow-hidden rounded-xl border">
	<Table.Root aria-label="Items">
		<Table.Header>
			<Table.Row>
				<Table.Head class="pl-4">Code</Table.Head>
				<Table.Head>Description</Table.Head>
				<Table.Head>Type</Table.Head>
				<Table.Head class="text-right">Price</Table.Head>
				<Table.Head>Taxes</Table.Head>
				<Table.Head></Table.Head>
				<Table.Head class="w-8"></Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each shown as i (i.inventoryid)}
				<Table.Row
					class="cursor-pointer {i.invarchive ? 'text-muted-foreground' : ''}"
					onclick={() => edit(i)}
				>
					<Table.Cell class="pl-4 font-medium tabular-nums">{i.invcode}</Table.Cell>
					<Table.Cell>{i.invitemdescription ?? ''}</Table.Cell>
					<Table.Cell>{i.invtype ?? ''}</Table.Cell>
					<Table.Cell class="text-right tabular-nums"
						>{i.invamount == null ? '' : money(i.invamount)}</Table.Cell
					>
					<Table.Cell class="text-muted-foreground"
						>{TAXES.filter((t) => i[t.key])
							.map((t) => SHORT[t.key])
							.join(' · ')}</Table.Cell
					>
					<Table.Cell>{#if i.invarchive}<Badge variant="secondary">Disabled</Badge>{/if}</Table.Cell>
					<Table.Cell><ChevronRightIcon class="text-muted-foreground size-4" /></Table.Cell>
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell colspan={7} class="text-muted-foreground py-8 text-center">No matches.</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>

<FormSheet
	bind:open
	title={editing ? `${editing.invcode.trim()} · ${editing.invitemdescription ?? 'Item'}` : 'New item'}
	saveLabel={editing ? 'Save item' : 'Add item'}
	{saving}
	canSave={!!form.code.trim()}
	onsave={() => save()}
>
	<div class="grid grid-cols-[7rem_1fr] gap-3">
		<div class="space-y-1.5">
			<Label for="item-code">Code</Label>
			<Input id="item-code" bind:value={form.code} maxlength={5} />
		</div>
		<div class="space-y-1.5">
			<Label for="item-description">Description</Label>
			<Input id="item-description" bind:value={form.description} maxlength={50} />
		</div>
	</div>
	<div class="grid grid-cols-[1fr_9rem] gap-3">
		<div class="space-y-1.5">
			<Label for="item-type">Type</Label>
			<Combobox
				id="item-type"
				bind:value={form.type}
				options={types.map((t) => ({ value: t.inventorytype, label: t.inventorytype }))}
				placeholder="Choose a type"
			/>
		</div>
		<div class="space-y-1.5">
			<Label for="item-price">Unit price</Label>
			<Input id="item-price" type="number" step="0.01" bind:value={form.price} />
		</div>
	</div>
	<TaxChecks taxes={TAXES} bind:values={form.taxes} />
	<div class="space-y-1.5">
		<Label for="item-notes">Notes</Label>
		<Textarea id="item-notes" bind:value={form.notes} rows={2} />
	</div>
	{#snippet action()}
		{#if editing}
			<Button variant="outline" onclick={() => save(editing!.invarchive)} disabled={saving || !form.code.trim()}>
				{editing.invarchive ? 'Enable item' : 'Disable item'}
			</Button>
		{/if}
	{/snippet}
</FormSheet>
