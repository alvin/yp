<script lang="ts">
	// Removing a rate, confirmed first as a charge is at the desk. A rate can be
	// removed until the day it starts, and the rate it ended runs on again: the
	// dialog says which.
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';

	let {
		open = $bindable(false),
		label,
		amount,
		detail,
		runsOn,
		removing = false,
		onremove
	}: {
		open?: boolean;
		/** What the rate is: "PST", "Lodge 04 · Double". */
		label: string;
		/** "8%", "$350.00". */
		amount: string;
		/** Its dates and code. */
		detail: string;
		/** The rate that runs on in its place, if one does. */
		runsOn?: string;
		removing?: boolean;
		onremove: () => void;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Remove this rate?</Dialog.Title>
			{#if runsOn}<Dialog.Description>{runsOn}</Dialog.Description>{/if}
		</Dialog.Header>
		<div class="bg-muted/40 rounded-lg border px-3 py-2 text-sm">
			<div class="flex items-center justify-between gap-3">
				<span class="min-w-0 truncate font-medium">{label}</span>
				<span class="shrink-0 tabular-nums">{amount}</span>
			</div>
			<div class="text-muted-foreground mt-0.5 text-xs">{detail}</div>
		</div>
		<Dialog.Footer>
			<Button variant="ghost" onclick={() => (open = false)}>Keep it</Button>
			<Button variant="destructive" disabled={removing} onclick={onremove}>
				<TrashIcon /> Remove rate
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
