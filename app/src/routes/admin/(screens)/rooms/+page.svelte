<script lang="ts">
	// The rooms and their rates, as Access's Room form kept them, with the two
	// lookups they use: rate codes and room types.
	import BedDoubleIcon from '@lucide/svelte/icons/bed-double';
	import AdminTabs from '$lib/components/admin/admin-tabs.svelte';
	import HelpSheet from '$lib/components/app/help-sheet.svelte';
	import { HELP } from '$lib/admin-help.js';
	import RoomsTab from '$lib/components/admin/rooms-tab.svelte';
	import RateCodesTab from '$lib/components/admin/rate-codes-tab.svelte';
	import RoomTypesTab from '$lib/components/admin/room-types-tab.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Rooms & Rates · Admin · Yellow Point Lodge</title></svelte:head>

<div class="mb-5 flex items-center justify-between gap-3">
	<h1 class="flex items-center gap-2 text-xl font-semibold">
		<BedDoubleIcon class="size-5" /> Rooms &amp; Rates
	</h1>
	<HelpSheet help={HELP.rooms} />
</div>

<AdminTabs
	tabs={[
		{ value: 'rooms', label: 'Rooms' },
		{ value: 'codes', label: 'Rate codes' },
		{ value: 'types', label: 'Room types' }
	]}
>
	{#snippet content(tab)}
		{#if tab === 'rooms'}
			<RoomsTab rooms={data.rooms} rates={data.rates} codes={data.codes} types={data.types} />
		{:else if tab === 'codes'}
			<RateCodesTab codes={data.codes} />
		{:else}
			<RoomTypesTab types={data.types} />
		{/if}
	{/snippet}
</AdminTabs>
