<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import CheckoutBillBody from '$lib/components/reports/checkout-bill-body.svelte';
	import { guestDocTabs } from '$lib/report-nav.js';

	let { data } = $props();
	const h = $derived(data.header);
</script>

<svelte:head><title>Statement · #{h.resnumber}</title></svelte:head>

<ReportShell
	title="Checkout Bill #{h.resnumber}"
	tabs={guestDocTabs(h.resnumber, 'checkout-bill')}
	backHref="/reservations/{h.resnumber}"
	backLabel="Reservation"
>
	<CheckoutBillBody {h} lines={data.lines} />
</ReportShell>
