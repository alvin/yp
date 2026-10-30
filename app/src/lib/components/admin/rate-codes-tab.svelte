<script lang="ts">
	// The room rate codes, as in Access's Maintain Lookup Tables: each code and
	// what it stands for. A code opens in the drawer to change its
	// description; Add rate code adds one. The rates carry the code itself, so
	// a code isn't renamed.
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import FormSheet from '$lib/components/app/form-sheet.svelte';
	import { saveRateCode } from '$lib/data/mutations.js';
	import { errorMessage } from '$lib/utils.js';
	import type { RateCodeRow } from '$lib/data/types.js';

	let { codes }: { codes: RateCodeRow[] } = $props();

	const shown = $derived(
		[...codes].sort((a, b) =>
			a.roomratecode.localeCompare(b.roomratecode, 'en', { sensitivity: 'base', numeric: true })
		)
	);

	let open = $state(false);
	let saving = $state(false);
	let editing = $state<RateCodeRow | null>(null);
	let form = $state({ code: '', description: '' });

	function edit(c: RateCodeRow) {
		editing = c;
		form = { code: c.roomratecode, description: c.description ?? '' };
		open = true;
	}

	function add() {
		editing = null;
		form = { code: '', description: '' };
		open = true;
	}

	async function save() {
		saving = true;
		const code = form.code.trim();
		try {
			await saveRateCode(code, form.description, !editing);
			open = false;
			toast.success(`${editing ? 'Saved' : 'Added'} ${code}`);
			await invalidateAll();
		} catch (e) {
			toast.error(errorMessage(e, 'Could not save the rate code.'));
		} finally {
			saving = false;
		}
	}
</script>

<div class="mb-3 flex justify-end">
	<Button onclick={add}><PlusIcon /> Add rate code</Button>
</div>

<div class="bg-card overflow-hidden rounded-xl border">
	<Table.Root aria-label="Rate codes">
		<Table.Header>
			<Table.Row>
				<Table.Head class="pl-4">Code</Table.Head>
				<Table.Head>Description</Table.Head>
				<Table.Head class="text-right">Rooms</Table.Head>
				<Table.Head class="w-8"></Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each shown as c (c.roomratecode)}
				<Table.Row class="cursor-pointer" onclick={() => edit(c)}>
					<Table.Cell class="pl-4 font-medium tabular-nums">{c.roomratecode}</Table.Cell>
					<Table.Cell>{c.description ?? ''}</Table.Cell>
					<Table.Cell class="text-right tabular-nums">{c.rooms || ''}</Table.Cell>
					<Table.Cell><ChevronRightIcon class="text-muted-foreground size-4" /></Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>

<FormSheet
	bind:open
	title={editing ? editing.roomratecode : 'New rate code'}
	saveLabel={editing ? 'Save rate code' : 'Add rate code'}
	{saving}
	canSave={!!form.code.trim()}
	onsave={save}
>
	{#if !editing}
		<div class="space-y-1.5">
			<Label for="code-code">Code</Label>
			<Input id="code-code" bind:value={form.code} maxlength={5} class="w-28" />
		</div>
	{/if}
	<div class="space-y-1.5">
		<Label for="code-description">Description</Label>
		<Input id="code-description" bind:value={form.description} maxlength={50} />
	</div>
</FormSheet>
