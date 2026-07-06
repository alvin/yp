<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import CheckInFolioBody from '$lib/components/reports/check-in-folio-body.svelte';
	import { guestDocTabs } from '$lib/report-nav.js';

	let { data } = $props();
	const r = $derived(data.report);
</script>

<svelte:head><title>Check-in folio · #{r.resnumber}</title></svelte:head>

<ReportShell
	title="Check-in Folio #{r.resnumber}"
	tabs={guestDocTabs(r.resnumber, 'check-in-folio')}
	backHref="/reservations/{r.resnumber}"
	backLabel="Reservation"
>
	<CheckInFolioBody {r} />
</ReportShell>
