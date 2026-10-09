<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import { Button } from '$lib/components/ui/button/index.js';
	import CancellationNoticeBody from '$lib/components/reports/cancellation-notice-body.svelte';
	import CheckInFolioBody from '$lib/components/reports/check-in-folio-body.svelte';
	import CheckoutBillBody from '$lib/components/reports/checkout-bill-body.svelte';
	import ConfirmationBody from '$lib/components/reports/confirmation-body.svelte';
	import HousekeepingBody from '$lib/components/reports/housekeeping-body.svelte';
	import InHouseBody from '$lib/components/reports/in-house-body.svelte';
	import KitchenBody from '$lib/components/reports/kitchen-body.svelte';
	import ManualSalesBody from '$lib/components/reports/manual-sales-body.svelte';
	import type { GuestDocument } from '$lib/data/types.js';
	import { dateMed } from '$lib/format.js';
	import type { PaperStock } from '$lib/print-stock.js';
	import { GUEST_DOCUMENTS } from '$lib/report-nav.js';
	import '$lib/report.css';

	let { data } = $props();

	// Housekeeping, In House, Kitchen/Meal and Manual Sales print every day.
	const reportCount = 4;
	const guestDocCount = $derived(
		data.confirmations.length +
			data.folios.length +
			data.bills.length +
			data.cancellations.length
	);
	const totalPages = $derived(reportCount + guestDocCount);

	const countLine = $derived.by(() => {
		const n = (count: number, word: string) =>
			count ? `${count} ${word}${count === 1 ? '' : 's'}` : '';
		const parts = [
			`${reportCount} reports`,
			n(data.confirmations.length, 'confirmation'),
			n(data.folios.length, 'folio'),
			n(data.bills.length, 'bill'),
			n(data.cancellations.length, 'cancellation')
		].filter(Boolean);
		return `${totalPages} page${totalPages === 1 ? '' : 's'} ready: ${parts.join(' · ')}`;
	});

	// The daily reports print together on letter. Each kind of guest document
	// prints on its own, on the folio paper printed on the back for it.
	type Group = 'reports' | GuestDocument;
	const docPages: Record<GuestDocument, number> = $derived({
		confirmation: data.confirmations.length,
		check_in_folio: data.folios.length,
		checkout_bill: data.bills.length,
		cancellation_notice: data.cancellations.length
	});
	const groups: { key: Group; label: string; stock: PaperStock; pages: number }[] = $derived([
		{ key: 'reports', label: 'Reports', stock: 'letter', pages: reportCount },
		...GUEST_DOCUMENTS.map((d) => ({
			key: d.key,
			label: `${d.label}s`,
			stock: 'a5' as const,
			pages: docPages[d.key]
		}))
	]);
	const group = (key: Group) => groups.find((g) => g.key === key)!;

	// A browser cannot pick a printer, so each group prints on its own: the
	// print action carries that group's page size and hides the others, and
	// the operator sends it to the tray holding that paper.
	let printing = $state<Group | null>(null);

	async function printGroup(key: Group) {
		printing = key;
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
		@page { size: ${printing && group(printing).stock === 'a5' ? 'A5' : 'letter'}; margin: 0.5in; }
		@media print {
			.report-page { page-break-after: always; }
			.report-page:last-child { page-break-after: auto; }
			.report-page .footer { position: static; margin-top: 24px; }
			${printing ? `.batch-group:not([data-group="${printing}"]) { display: none !important; }` : ''}
		}
	</style>`}
</svelte:head>

{#snippet heading(key: Group)}
	{@const g = group(key)}
	<div class="batch-heading no-print">
		{g.label} · {g.stock === 'a5' ? 'A5' : 'letter'} · {g.pages} page{g.pages === 1 ? '' : 's'}
	</div>
{/snippet}

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
				{#each groups as g (g.key)}
					<Button
						size="sm"
						data-testid="print-{g.key}"
						disabled={!g.pages}
						onclick={() => printGroup(g.key)}
					>
						<PrinterIcon /> {g.label}
					</Button>
				{/each}
			</div>
		</div>
	</div>

	<div class="batch-group" data-group="reports" data-testid="group-reports">
		{@render heading('reports')}
		<div class="batch-caption landscape no-print">Housekeeping Report</div>
		<div class="report-page landscape">
			<HousekeepingBody date={data.date} rows={data.reports.housekeeping} />
		</div>
		<div class="batch-caption landscape no-print">In House Report</div>
		<div class="report-page landscape">
			<InHouseBody
				date={data.date}
				rows={data.reports.inHouse}
				totalGuests={data.reports.totalGuests}
			/>
		</div>
		<div class="batch-caption landscape no-print">Kitchen/Meal Report</div>
		<div class="report-page landscape">
			<KitchenBody
				date={data.date}
				rows={data.reports.kitchenRows}
				totalGuests={data.reports.totalGuests}
			/>
		</div>
		<div class="batch-caption no-print">Manual Sales List</div>
		<div class="report-page">
			<ManualSalesBody date={data.date} rows={data.reports.manualSales} />
		</div>
	</div>
	{#if data.confirmations.length}
		<div class="batch-group" data-group="confirmation" data-testid="group-confirmation">
			{@render heading('confirmation')}
			{#each data.confirmations as c (c.report.resnumber)}
				<div class="batch-caption no-print">
					Confirmation #{c.report.resnumber} — {c.report.guest}
				</div>
				<div class="report-page a5"><ConfirmationBody r={c.report} rooms={c.rooms} /></div>
			{/each}
		</div>
	{/if}
	{#if data.folios.length}
		<div class="batch-group" data-group="check_in_folio" data-testid="group-check_in_folio">
			{@render heading('check_in_folio')}
			{#each data.folios as f (f.report.resnumber)}
				<div class="batch-caption no-print">
					Check-in Folio #{f.report.resnumber} — {f.report.guest}
				</div>
				<div class="report-page a5">
					<CheckInFolioBody r={f.report} rooms={f.rooms} receipts={f.receipts} />
				</div>
			{/each}
		</div>
	{/if}
	{#if data.bills.length}
		<div class="batch-group" data-group="checkout_bill" data-testid="group-checkout_bill">
			{@render heading('checkout_bill')}
			{#each data.bills as bill (bill.header.resnumber)}
				<div class="batch-caption no-print">
					Checkout Bill #{bill.header.resnumber} — {bill.header.guest}
				</div>
				<div class="report-page a5"><CheckoutBillBody h={bill.header} lines={bill.lines} /></div>
			{/each}
		</div>
	{/if}
	{#if data.cancellations.length}
		<div
			class="batch-group"
			data-group="cancellation_notice"
			data-testid="group-cancellation_notice"
		>
			{@render heading('cancellation_notice')}
			{#each data.cancellations as r (r.resnumber)}
				<div class="batch-caption no-print">
					Cancellation Notice #{r.resnumber} — {r.guest}
				</div>
				<div class="report-page a5"><CancellationNoticeBody {r} /></div>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* The batch is one print job, so its page count would run across every
	   report in it; reports printed here are left unnumbered instead. */
	.batch-group .report-page {
		page: batch;
	}
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
