<script lang="ts">
	import { money } from '$lib/format.js';
	import { cn } from '$lib/utils.js';

	let {
		value,
		muteZero = false,
		class: className = ''
	}: { value: number | null | undefined; muteZero?: boolean; class?: string } = $props();

	const v = $derived(Number(value ?? 0));
</script>

<span
	class={cn(
		'tabular-nums',
		v < 0 && 'text-destructive',
		muteZero && v === 0 && 'text-muted-foreground',
		className
	)}>{money(v)}</span
>
