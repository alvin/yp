<script lang="ts">
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import RowAction from '$lib/components/app/row-action.svelte';

	let {
		label,
		value = null,
		onedit
	}: {
		label: string;
		value?: string | number | null;
		/** A pen beside the value opens its editor, as on a room or a charge. */
		onedit?: () => void;
	} = $props();
</script>

<div class="min-w-0" class:group={!!onedit}>
	<dt class="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">{label}</dt>
	{#if onedit}
		<dd class="mt-0.5 flex items-center gap-1 text-sm font-medium break-words">
			{value ?? '—'}
			<RowAction
				icon={PencilIcon}
				label="Change {label.toLowerCase()}"
				title="Change {label.toLowerCase()}"
				class="shrink-0"
				onclick={onedit}
			/>
		</dd>
	{:else}
		<dd class="mt-0.5 text-sm font-medium break-words">{value ?? '—'}</dd>
	{/if}
</div>
