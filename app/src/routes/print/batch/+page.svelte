<script lang="ts">
	import { tick } from 'svelte';
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
	import { STOCK_LABEL, type PaperStock } from '$lib/print-stock.js';
	import '$lib/report.css';

	let { data } = $props();

	const reportCount = $derived(data.reports ? 4 : 0);
	const guestDocCount = $derived(
		data.confirmations.length + data.folios.length + data.bills.length
	);
	const totalPages = $derived(reportCount + guestDocCount);

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

	const pagesIn: Record<PaperStock, number> = $derived({
		letter: reportCount,
		a5: guestDocCount
	});

	// A browser cannot pick a printer, so each stock prints on its own: the
	// print action carries that stock's page size and hides the other group,
	// and the operator sends it to the tray holding that paper.
	let printing = $state<PaperStock | null>(null);

	async function printStock(stock: PaperStock) {
		printing = stock;
		await tick();
		try {
			window.print();
		} finally {
			printing = null;
		}
	}

	function changeDate(d: string) {
		if (!d) return;
		const params = new URLSearchParams(page.url.searchParams);
		params.set('date', d);
		goto(`/print/batch?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>Batch print · {dateMed(data.date)}</title>
	<!-- One @page per print action: per-page orientation is unreliable across
	     browsers, so landscape reports reflow into portrait. Footers must also
	     leave print's fixed positioning, or every report's footer would repeat
	     on every sheet of the batch. -->
	{@html `<style>
		@page { size: ${printing === 'a5' ? 'A5' : 'letter'}; margin: 0.5in; }
		@media print {
			.report-page { page-break-after: always; }
			.report-page:last-child { page-break-after: auto; }
			.report-page .footer { position: static; margin-top: 24px; }
			${printing ? `.batch-group:not([data-stock="${printing}"]) { display: none !important; }` : ''}
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
					class="h-8 rounded-md border bg-field px-2 text-sm shadow-xs"
				/>
				<Button
					size="sm"
					data-testid="print-letter"
					disabled={!pagesIn.letter}
					onclick={() => printStock('letter')}
				>
					<PrinterIcon /> {STOCK_LABEL.letter}
				</Button>
				<Button
					size="sm"
					data-testid="print-a5"
					disabled={!pagesIn.a5}
					onclick={() => printStock('a5')}
				>
					<PrinterIcon /> {STOCK_LABEL.a5}
				</Button>
			</div>
		</div>
	</div>

	{#if !totalPages}
		<div
			class="no-print mx-auto mt-24 max-w-md rounded-lg border border-dashed bg-card p-8 text-center"
		>
			<p class="text-sm font-medium">Nothing to print for {dateMed(data.date)}</p>
			<p class="text-muted-foreground mt-1 text-sm">
				No reports or guest documents are queued for this date. Pick another date above.
			</p>
		</div>
	{:else}
		{#if data.reports}
			<div class="batch-group" data-stock="letter" data-testid="group-letter">
				<div class="batch-heading no-print">
					{STOCK_LABEL.letter} · letter · {pagesIn.letter} pages
				</div>
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
			</div>
		{/if}
		{#if guestDocCount}
			<div class="batch-group" data-stock="a5" data-testid="group-a5">
				<div class="batch-heading no-print">
					{STOCK_LABEL.a5} · A5 · {pagesIn.a5} pages
				</div>
				{#each data.confirmations as c (c.report.resnumber)}
					<div class="batch-caption no-print">
						Confirmation #{c.report.resnumber} — {c.report.guest}
					</div>
					<div class="report-page a5"><ConfirmationBody r={c.report} rooms={c.rooms} /></div>
				{/each}
				{#each data.folios as f (f.report.resnumber)}
					<div class="batch-caption no-print">
						Check-in Folio #{f.report.resnumber} — {f.report.guest}
					</div>
					<div class="report-page a5">
						<CheckInFolioBody r={f.report} rooms={f.rooms} receipts={f.receipts} />
					</div>
				{/each}
				{#each data.bills as bill (bill.header.resnumber)}
					<div class="batch-caption no-print">
						Checkout Bill #{bill.header.resnumber} — {bill.header.guest}
					</div>
					<div class="report-page a5"><CheckoutBillBody h={bill.header} lines={bill.lines} /></div>
				{/each}
			</div>
		{/if}
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
	.batch-heading {
		width: 1220px;
		margin: 36px auto -8px;
		font-size: 13px;
		font-weight: 600;
		color: #333;
	}
</style>
