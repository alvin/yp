<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';

	let {
		label,
		value = null,
		children,
		class: className = ''
	}: { label: string; value?: string | number | null; children?: Snippet; class?: string } =
		$props();
</script>

<div class={cn('min-w-0', className)}>
	<dt class="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">{label}</dt>
	<dd class="mt-0.5 text-sm font-medium break-words">
		{#if children}{@render children()}{:else}{value ?? '—'}{/if}
	</dd>
</div>
