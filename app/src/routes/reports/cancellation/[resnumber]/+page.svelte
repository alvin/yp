<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import CancellationNoticeBody from '$lib/components/reports/cancellation-notice-body.svelte';
	import { guestDocTabs } from '$lib/report-nav.js';

	let { data } = $props();
	const r = $derived(data.report);
</script>

<svelte:head><title>Cancellation · #{r.resnumber}</title></svelte:head>

<ReportShell
	stock="a5"
	title="Cancellation Notice #{r.resnumber}"
	tabs={guestDocTabs(r.resnumber, 'cancellation', data.cancelled)}
	backHref="/reservations/{r.resnumber}"
	backLabel="Reservation"
>
	<CancellationNoticeBody {r} />
</ReportShell>
