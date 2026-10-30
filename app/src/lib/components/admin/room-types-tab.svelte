<script lang="ts">
	// The room types, as in Access's Maintain Lookup Tables, with how many
	// active rooms are of each. Add room type adds one; the rooms carry the
	// name itself, so a type isn't renamed.
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import FormSheet from '$lib/components/app/form-sheet.svelte';
	import { addRoomType } from '$lib/data/mutations.js';
	import { errorMessage } from '$lib/utils.js';
	import type { RoomTypeRow } from '$lib/data/types.js';

	let { types }: { types: RoomTypeRow[] } = $props();

	let open = $state(false);
	let saving = $state(false);
	let name = $state('');

	function add() {
		name = '';
		open = true;
	}

	async function save() {
		saving = true;
		const value = name.trim();
		try {
			await addRoomType(value);
			open = false;
			toast.success(`Added ${value}`);
			await invalidateAll();
		} catch (e) {
			toast.error(errorMessage(e, 'Could not add the room type.'));
		} finally {
			saving = false;
		}
	}
</script>

<div class="mb-3 flex justify-end">
	<Button onclick={add}><PlusIcon /> Add room type</Button>
</div>

<div class="bg-card overflow-hidden rounded-xl border">
	<Table.Root aria-label="Room types">
		<Table.Header>
			<Table.Row>
				<Table.Head class="pl-4">Room type</Table.Head>
				<Table.Head class="text-right pr-4">Active rooms</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each types as t (t.roomtype)}
				<Table.Row>
					<Table.Cell class="pl-4 font-medium">{t.roomtype}</Table.Cell>
					<Table.Cell class="pr-4 text-right tabular-nums">{t.rooms}</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>

<FormSheet bind:open title="New room type" saveLabel="Add room type" {saving} canSave={!!name.trim()} onsave={save}>
	<div class="space-y-1.5">
		<Label for="room-type-name">Name</Label>
		<Input id="room-type-name" bind:value={name} maxlength={25} />
	</div>
</FormSheet>
