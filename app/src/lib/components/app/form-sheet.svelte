<script lang="ts">
	// A form in the side drawer, for the line picked from a list beside it: its
	// title, the fields, and the footer every form at the desk has (Cancel and
	// the save button), with room on the left for an action on the record
	// itself, such as disabling it. Enter saves, as in the dialogs. A form
	// opened from inside another (a room's rate) carries a way back to it.
	import type { Snippet } from 'svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { cn } from '$lib/utils.js';

	let {
		open = $bindable(false),
		title,
		description,
		saveLabel = 'Save',
		saving = false,
		canSave = true,
		onsave,
		oncancel,
		back,
		class: className,
		children,
		action
	}: {
		open?: boolean;
		title: string;
		description?: string;
		saveLabel?: string;
		saving?: boolean;
		canSave?: boolean;
		onsave: () => void;
		/** What Cancel does; it closes the drawer unless given. */
		oncancel?: () => void;
		/** The form this one was opened from. */
		back?: { label: string; onclick: () => void };
		class?: string;
		children: Snippet;
		/** A button on the record itself, at the footer's left. */
		action?: Snippet;
	} = $props();

	const formId = $props.id();
</script>

<Sheet.Root bind:open>
	<Sheet.Content class={cn(className)}>
		<Sheet.Header class="pr-8">
			{#if back}
				<Button variant="ghost" size="sm" class="-ml-2 w-fit" onclick={back.onclick}>
					<ArrowLeftIcon />
					{back.label}
				</Button>
			{/if}
			<Sheet.Title>{title}</Sheet.Title>
			{#if description}<Sheet.Description>{description}</Sheet.Description>{/if}
		</Sheet.Header>
		<form
			id={formId}
			class="-mx-6 flex-1 space-y-3 overflow-y-auto px-6 py-1"
			onsubmit={(e) => {
				e.preventDefault();
				if (canSave && !saving) onsave();
			}}
		>
			{@render children()}
		</form>
		<Sheet.Footer class="border-t pt-4 sm:items-center sm:justify-between">
			<div>{@render action?.()}</div>
			<div class="flex flex-col-reverse gap-2 sm:flex-row">
				<Button variant="ghost" onclick={() => (oncancel ? oncancel() : (open = false))}>Cancel</Button>
				<Button type="submit" form={formId} disabled={saving || !canSave}>{saveLabel}</Button>
			</div>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>
