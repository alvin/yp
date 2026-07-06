<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import ConfirmationBody from '$lib/components/reports/confirmation-body.svelte';
	import { guestDocTabs } from '$lib/report-nav.js';

	let { data } = $props();
	const r = $derived(data.report);
</script>

<svelte:head><title>Confirmation · #{r.resnumber}</title></svelte:head>

<ReportShell
	title="Reservation Confirmation #{r.resnumber}"
	tabs={guestDocTabs(r.resnumber, 'confirmation')}
	backHref="/reservations/{r.resnumber}"
	backLabel="Reservation"
>
	<ConfirmationBody {r} />
</ReportShell>
