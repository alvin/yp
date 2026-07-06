<script lang="ts">
	import { goto } from '$app/navigation';
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import ManualSalesBody from '$lib/components/reports/manual-sales-body.svelte';
	import { dateShort } from '$lib/format.js';
	import { opsTabs } from '$lib/report-nav.js';

	let { data } = $props();

	function toggleCancelled(show: boolean) {
		const params = new URLSearchParams({ date: data.date });
		if (show) params.set('cancelled', '1');
		goto(`/reports/manual-sales?${params.toString()}`);
	}
</script>

<svelte:head><title>Manual sales list · {dateShort(data.date)}</title></svelte:head>

<ReportShell
	title="Manual Sales List — {dateShort(data.date)}"
	tabs={opsTabs(data.date, 'manual-sales')}
	date={data.date}
	backHref="/print"
	backLabel="Print Center"
>
	{#snippet toolbar()}
		<label class="text-muted-foreground flex h-8 items-center gap-1.5 text-xs">
			<input
				type="checkbox"
				checked={data.includeCancelled}
				onchange={(e) => toggleCancelled(e.currentTarget.checked)}
				class="size-3.5 accent-primary"
			/>
			Show cancelled
		</label>
	{/snippet}
	<ManualSalesBody date={data.date} rows={data.rows} />
</ReportShell>
