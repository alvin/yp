<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import HousekeepingBody from '$lib/components/reports/housekeeping-body.svelte';
	import { dateShort } from '$lib/format.js';
	import { opsTabs } from '$lib/report-nav.js';

	let { data } = $props();
</script>

<svelte:head><title>Housekeeping · {dateShort(data.date)}</title></svelte:head>

<ReportShell
	title="Housekeeping Report — {dateShort(data.date)}"
	orientation="landscape"
	tabs={opsTabs(data.date, 'housekeeping')}
	date={data.date}
	backHref="/print"
	backLabel="Print Center"
>
	<HousekeepingBody date={data.date} rows={data.rows} />
</ReportShell>
