<script lang="ts" generics="T extends string">
	// Two choices side by side; the chosen one is raised.
	let {
		value = $bindable(),
		options,
		onchange
	}: {
		value: T;
		options: [{ value: T; label: string }, { value: T; label: string }];
		/** Called after a choice is picked. */
		onchange?: (value: T) => void;
	} = $props();
</script>

<div class="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
	{#each options as o (o.value)}
		<button
			type="button"
			class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {value === o.value
				? 'bg-field shadow-sm'
				: 'text-muted-foreground'}"
			onclick={() => {
				value = o.value;
				onchange?.(o.value);
			}}>{o.label}</button
		>
	{/each}
</div>
