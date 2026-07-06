<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import InHouseBody from '$lib/components/reports/in-house-body.svelte';
	import { dateShort } from '$lib/format.js';
	import { opsTabs } from '$lib/report-nav.js';

	let { data } = $props();
</script>

<svelte:head><title>In house · {dateShort(data.date)}</title></svelte:head>

<ReportShell
	title="In House Report — {dateShort(data.date)}"
	orientation="landscape"
	tabs={opsTabs(data.date, 'in-house')}
	date={data.date}
	backHref="/print"
	backLabel="Print Center"
>
	<InHouseBody date={data.date} rows={data.rows} />
</ReportShell>
