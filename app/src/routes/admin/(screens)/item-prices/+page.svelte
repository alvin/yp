<script lang="ts">
	// The items the lodge charges for, and their types.
	import TagsIcon from '@lucide/svelte/icons/tags';
	import AdminTabs from '$lib/components/admin/admin-tabs.svelte';
	import HelpSheet from '$lib/components/app/help-sheet.svelte';
	import { HELP } from '$lib/admin-help.js';
	import ItemsTab from '$lib/components/admin/items-tab.svelte';
	import ItemTypesTab from '$lib/components/admin/item-types-tab.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Item Prices · Admin · Yellow Point Lodge</title></svelte:head>

<div class="mb-5 flex items-center justify-between gap-3">
	<h1 class="flex items-center gap-2 text-xl font-semibold">
		<TagsIcon class="size-5" /> Item Prices
	</h1>
	<HelpSheet help={HELP.itemPrices} />
</div>

<AdminTabs
	tabs={[
		{ value: 'items', label: 'Items' },
		{ value: 'types', label: 'Item types' }
	]}
>
	{#snippet content(tab)}
		{#if tab === 'items'}
			<ItemsTab items={data.items} types={data.types} />
		{:else}
			<ItemTypesTab types={data.types} lines={data.lines} />
		{/if}
	{/snippet}
</AdminTabs>
