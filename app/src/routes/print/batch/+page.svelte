<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import { Button } from '$lib/components/ui/button/index.js';
	import CheckInFolioBody from '$lib/components/reports/check-in-folio-body.svelte';
	import CheckoutBillBody from '$lib/components/reports/checkout-bill-body.svelte';
	import ConfirmationBody from '$lib/components/reports/confirmation-body.svelte';
	import HousekeepingBody from '$lib/components/reports/housekeeping-body.svelte';
	import InHouseBody from '$lib/components/reports/in-house-body.svelte';
	import KitchenBody from '$lib/components/reports/kitchen-body.svelte';
	import ManualSalesBody from '$lib/components/reports/manual-sales-body.svelte';
	import { dateMed } from '$lib/format.js';
	import '$lib/report.css';

	let { data } = $props();

	const reportCount = $derived(data.reports ? 4 : 0);
	const totalPages = $derived(
		reportCount + data.confirmations.length + data.folios.length + data.bills.length
	);

	const countLine = $derived.by(() => {
		if (!totalPages) return 'Nothing to print';
		const n = (count: number, word: string) =>
			count ? `${count} ${word}${count === 1 ? '' : 's'}` : '';
		const parts = [
			data.reports ? `${reportCount} reports` : '',
			n(data.confirmations.length, 'confirmation'),
			n(data.folios.length, 'folio'),
			n(data.bills.length, 'bill')
		].filter(Boolean);
		return `${totalPages} page${totalPages === 1 ? '' : 's'} ready: ${parts.join(' · ')}`;
	});

	function changeDate(d: string) {
		if (!d) return;
		const params = new URLSearchParams(page.url.searchParams);
		params.set('date', d);
		goto(`/print/batch?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>Batch print · {dateMed(data.date)}</title>
	<!-- One @page for the whole batch: per-page orientation is unreliable across
	     browsers, so landscape reports reflow into portrait letter. Footers must
	     also leave print's fixed positioning, or every report's footer would
	     repeat on every sheet of the batch. -->
	{@html `<style>
		@page { size: letter; margin: 0.5in; }
		@media print {
			.report-page { page-break-after: always; }
			.report-page:last-child { page-break-after: auto; }
			.report-page .footer { position: static; margin-top: 24px; }
		}
	</style>`}
</svelte:head>

<div class="report-root min-h-screen pb-16">
	<div class="no-print sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
		<div class="mx-auto flex max-w-[1220px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
			<Button variant="ghost" size="sm" onclick={() => history.back()}>
				<ArrowLeftIcon /> Back
			</Button>
			<span class="text-muted-foreground truncate text-sm font-medium"
				>Batch print · {dateMed(data.date)}</span
			>
			<span class="text-muted-foreground text-xs tabular-nums">{countLine}</span>
			<div class="ml-auto flex flex-wrap items-center gap-2">
				<label class="text-muted-foreground text-xs" for="batch-date">Date</label>
				<input
					id="batch-date"
					type="date"
					value={data.date}
					onchange={(e) => changeDate(e.currentTarget.value)}
					class="h-8 rounded-md border bg-background px-2 text-sm shadow-xs"
				/>
				<Button size="sm" disabled={!totalPages} onclick={() => window.print()}>
					<PrinterIcon /> Print
				</Button>
			</div>
		</div>
	</div>

	{#if !totalPages}
		<div
			class="no-print mx-auto mt-24 max-w-md rounded-lg border border-dashed bg-background p-8 text-center"
		>
			<p class="text-sm font-medium">Nothing to print for {dateMed(data.date)}</p>
			<p class="text-muted-foreground mt-1 text-sm">
				No reports or guest documents are queued for this date. Pick another date above.
			</p>
		</div>
	{:else}
		{#if data.reports}
			<div class="batch-caption landscape no-print">Housekeeping Report</div>
			<div class="report-page landscape">
				<HousekeepingBody date={data.date} rows={data.reports.housekeeping} />
			</div>
			<div class="batch-caption landscape no-print">In House Report</div>
			<div class="report-page landscape">
				<InHouseBody date={data.date} rows={data.reports.inHouse} />
			</div>
			<div class="batch-caption landscape no-print">Kitchen/Meal Report</div>
			<div class="report-page landscape">
				<KitchenBody
					date={data.date}
					rows={data.reports.kitchenRows}
					totalGuests={data.reports.kitchenTotalGuests}
				/>
			</div>
			<div class="batch-caption no-print">Manual Sales List</div>
			<div class="report-page">
				<ManualSalesBody date={data.date} rows={data.reports.manualSales} />
			</div>
		{/if}
		{#each data.confirmations as r (r.resnumber)}
			<div class="batch-caption no-print">Confirmation #{r.resnumber} — {r.guest}</div>
			<div class="report-page"><ConfirmationBody {r} /></div>
		{/each}
		{#each data.folios as r (r.resnumber)}
			<div class="batch-caption no-print">Check-in Folio #{r.resnumber} — {r.guest}</div>
			<div class="report-page"><CheckInFolioBody {r} /></div>
		{/each}
		{#each data.bills as bill (bill.header.resnumber)}
			<div class="batch-caption no-print">
				Checkout Bill #{bill.header.resnumber} — {bill.header.guest}
			</div>
			<div class="report-page"><CheckoutBillBody h={bill.header} lines={bill.lines} /></div>
		{/each}
	{/if}
</div>

<style>
	.batch-caption {
		width: 980px;
		margin: 28px auto -24px;
		font-size: 12px;
		font-weight: 500;
		color: #555;
	}
	.batch-caption.landscape {
		width: 1220px;
	}
</style>
