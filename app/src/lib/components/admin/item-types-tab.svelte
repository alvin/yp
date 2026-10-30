<script lang="ts">
	// The item types, each with the daily cash line its items' charges post
	// to. A line opens the type in the drawer; Add item type adds one.
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Combobox } from '$lib/components/ui/combobox/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import FormSheet from '$lib/components/app/form-sheet.svelte';
	import { saveItemType } from '$lib/data/mutations.js';
	import { errorMessage } from '$lib/utils.js';
	import type { ItemTypeRow } from '$lib/data/types.js';

	let { types, lines }: { types: ItemTypeRow[]; lines: string[] } = $props();

	let open = $state(false);
	let saving = $state(false);
	let editing = $state<ItemTypeRow | null>(null);
	let form = $state({ name: '', line: '' });

	function edit(t: ItemTypeRow) {
		editing = t;
		form = { name: t.inventorytype, line: t.transactiontype };
		open = true;
	}

	function add() {
		editing = null;
		form = { name: '', line: 'Misc.' };
		open = true;
	}

	async function save() {
		saving = true;
		const name = form.name.trim();
		try {
			await saveItemType(name, form.line);
			open = false;
			toast.success(`${editing ? 'Saved' : 'Added'} ${name}`);
			await invalidateAll();
		} catch (e) {
			toast.error(errorMessage(e, 'Could not save the item type.'));
		} finally {
			saving = false;
		}
	}
</script>

<div class="mb-3 flex justify-end">
	<Button onclick={add}><PlusIcon /> Add item type</Button>
</div>

<div class="bg-card overflow-hidden rounded-xl border">
	<Table.Root aria-label="Item types">
		<Table.Header>
			<Table.Row>
				<Table.Head class="pl-4">Item type</Table.Head>
				<Table.Head>Daily cash line</Table.Head>
				<Table.Head class="text-right">Active items</Table.Head>
				<Table.Head class="w-8"></Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each types as t (t.inventorytype)}
				<Table.Row class="cursor-pointer" onclick={() => edit(t)}>
					<Table.Cell class="pl-4 font-medium">{t.inventorytype}</Table.Cell>
					<Table.Cell>{t.transactiontype}</Table.Cell>
					<Table.Cell class="text-right tabular-nums">{t.items}</Table.Cell>
					<Table.Cell><ChevronRightIcon class="text-muted-foreground size-4" /></Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>

<FormSheet
	bind:open
	title={editing ? editing.inventorytype : 'New item type'}
	saveLabel={editing ? 'Save item type' : 'Add item type'}
	{saving}
	canSave={!!form.name.trim() && !!form.line}
	onsave={save}
>
	{#if !editing}
		<div class="space-y-1.5">
			<Label for="type-name">Name</Label>
			<Input id="type-name" bind:value={form.name} maxlength={25} />
		</div>
	{/if}
	<div class="space-y-1.5">
		<Label for="type-line">Daily cash line</Label>
		<Combobox
			id="type-line"
			bind:value={form.line}
			options={lines.map((l) => ({ value: l, label: l }))}
		/>
	</div>
</FormSheet>
