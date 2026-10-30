<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import DailyCashTie from '$lib/components/app/daily-cash-tie.svelte';
	import ItemsCashedOutBody from '$lib/components/reports/items-cashed-out-body.svelte';
	import { dateLong, dateShort } from '$lib/format.js';
	import { dailyCashTabs } from '$lib/report-nav.js';

	let { data } = $props();

	const total = $derived(data.rows.reduce((s, row) => s + row.total, 0));
</script>

<svelte:head><title>Items cashed out · {dateShort(data.date)}</title></svelte:head>

<ReportShell
	title="Items Cashed Out — {dateLong(data.date)}"
	orientation="landscape"
	backHref="/reports/dcar?date={data.date}"
	backLabel="Daily Cash"
	tabs={dailyCashTabs(data.date, 'items-cashed-out')}
	date={data.date}
>
	{#snippet toolbar()}
		<DailyCashTie {total} dcar={data.dcar_item_sales} />
	{/snippet}
	<div class="blackbar">Yellow Point Lodge</div>
	<h1>Items Cashed Out</h1>
	<h3>for {dateShort(data.date)}, by Inventory Code</h3>
	<ItemsCashedOutBody rows={data.rows} />
</ReportShell>
