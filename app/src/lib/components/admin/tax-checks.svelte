<script lang="ts" generics="K extends string">
	// Which taxes apply, one tick box each, in a form. A null value (rooms that
	// differ) shows as partly ticked until it is ticked or cleared.
	let {
		taxes,
		values = $bindable()
	}: {
		taxes: { key: K; label: string }[];
		values: Record<K, boolean | null>;
	} = $props();
</script>

<div class="space-y-1.5">
	<span class="text-sm leading-none font-medium">Taxes</span>
	<div class="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
		{#each taxes as t (t.key)}
			<label class="flex cursor-pointer items-center gap-2 text-sm">
				<input
					type="checkbox"
					class="accent-primary size-4"
					checked={values[t.key] === true}
					indeterminate={values[t.key] == null}
					onchange={(e) => (values[t.key] = e.currentTarget.checked)}
				/>
				{t.label}
			</label>
		{/each}
	</div>
</div>
