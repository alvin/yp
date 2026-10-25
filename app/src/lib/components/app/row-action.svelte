<script lang="ts">
	import type { Component } from 'svelte';
	import { cn } from '$lib/utils.js';

	// An icon button that shows when its row (a `group`) is hovered or focused.
	let {
		icon: Icon,
		label,
		title,
		destructive = false,
		class: className,
		onclick
	}: {
		icon: Component<{ class?: string }>;
		/** What the button does, for a screen reader. */
		label: string;
		title: string;
		destructive?: boolean;
		class?: string;
		onclick: () => void;
	} = $props();
</script>

<button
	type="button"
	aria-label={label}
	{title}
	{onclick}
	class={cn(
		'text-muted-foreground rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
		destructive ? 'hover:text-destructive' : 'hover:text-foreground',
		className
	)}
>
	<Icon class="size-3.5" />
</button>
