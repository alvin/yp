<script lang="ts">
	// A page's tabs, the one shown kept in the address (?tab=) so a reload or
	// the back button comes back to it.
	import { untrack, type Snippet } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import * as Tabs from '$lib/components/ui/tabs/index.js';

	let {
		tabs,
		content
	}: {
		/** The first is shown when the address names none. */
		tabs: { value: string; label: string }[];
		content: Snippet<[string]>;
	} = $props();

	const named = page.url.searchParams.get('tab');
	let tab = $state(
		untrack(() => (tabs.some((t) => t.value === named) ? named! : tabs[0].value))
	);

	function show(value: string) {
		tab = value;
		const url = new URL(page.url);
		if (value === tabs[0].value) url.searchParams.delete('tab');
		else url.searchParams.set('tab', value);
		replaceState(url, page.state);
	}
</script>

<Tabs.Root value={tab} onValueChange={show}>
	<Tabs.List class="mb-4">
		{#each tabs as t (t.value)}
			<Tabs.Trigger value={t.value}>{t.label}</Tabs.Trigger>
		{/each}
	</Tabs.List>
	{#each tabs as t (t.value)}
		<Tabs.Content value={t.value}>{@render content(t.value)}</Tabs.Content>
	{/each}
</Tabs.Root>
