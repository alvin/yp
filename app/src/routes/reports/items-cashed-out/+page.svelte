<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import ReportFooter from '$lib/components/app/report-footer.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { dateLong, dateShort, money } from '$lib/format.js';
	import { dailyCashTabs } from '$lib/report-nav.js';
	import type { ItemsCashedOutRow } from '$lib/data/types.js';

	let { data } = $props();

	// "Other" collapses HST + room tax + hotel tax into a single printed column.
	function other(row: ItemsCashedOutRow): number {
		return row.hst + row.room_tax + row.hotel_tax;
	}

	interface Sums {
		quantity: number;
		total: number;
		gst: number;
		pst: number;
		dmt: number;
		liquor: number;
		other: number;
	}
	function add(sums: Sums, row: ItemsCashedOutRow): void {
		sums.quantity += row.quantity;
		sums.total += row.total;
		sums.gst += row.gst;
		sums.pst += row.pst;
		sums.dmt += row.dmt;
		sums.liquor += row.liquor;
		sums.other += other(row);
	}
	const zero = (): Sums => ({ quantity: 0, total: 0, gst: 0, pst: 0, dmt: 0, liquor: 0, other: 0 });

	// Rows arrive ordered by inv_code; group consecutive rows for subtotals.
	const groups = $derived.by(() => {
		const out: { code: string; rows: ItemsCashedOutRow[]; sums: Sums }[] = [];
		for (const row of data.rows) {
			let last = out[out.length - 1];
			if (!last || last.code !== row.inv_code) {
				last = { code: row.inv_code, rows: [], sums: zero() };
				out.push(last);
			}
			last.rows.push(row);
			add(last.sums, row);
		}
		return out;
	});
	const totals = $derived.by(() => {
		const sums = zero();
		for (const row of data.rows) add(sums, row);
		return sums;
	});
	// Sales plus every tax column; ties to DCAR 'Total Sales and Charges' + 'Total Taxes'.
	const salesAndTaxes = $derived(
		totals.total + totals.gst + totals.pst + totals.dmt + totals.liquor + totals.other
	);
	const agrees = $derived(Math.abs(salesAndTaxes - data.dcar_sales_and_taxes) < 0.005);
</script>

<svelte:head><title>Items cashed out · {dateShort(data.date)}</title></svelte:head>

<ReportShell
	title="Items Cashed Out — {dateLong(data.date)}"
	orientation="landscape"
	backHref="/reports/dcar?date={data.date}"
	backLabel="Daily Cash"
	tabs={dailyCashTabs(data.date, 'items-cashed-out')}
	date={data.date}
>
	{#snippet toolbar()}
		{#if agrees}
			<Badge variant="success">Ties to DCAR 'Total Sales and Charges' + 'Total Taxes' · ✓ Agrees</Badge>
		{:else}
			<Badge variant="warning">✗ Differs from DCAR line by {money(Math.abs(salesAndTaxes - data.dcar_sales_and_taxes))}</Badge>
		{/if}
	{/snippet}
	<div class="blackbar">Yellow Point Lodge</div>
	<h1>Items Cashed Out</h1>
	<h3>for {dateShort(data.date)}, by Inventory Code</h3>
	<table>
		<thead>
			<tr>
				<th>Inv Code</th>
				<th>Res #</th>
				<th>Last Name:</th>
				<th>First Name:</th>
				<th>Inventory Item:</th>
				<th>Qty:</th>
				<th>Total:</th>
				<th>GST:</th>
				<th>PST:</th>
				<th>DMT:</th>
				<th>Liq:</th>
				<th>Other</th>
			</tr>
		</thead>
		<tbody>
			{#each groups as group (group.code)}
				{#each group.rows as row, i (row.resnumber + '-' + i)}
					<tr>
						<td>{row.inv_code}</td>
						<td>{row.resnumber}</td>
						<td>{row.guestlastname}</td>
						<td>{row.guestfirstname ?? ''}</td>
						<td>{row.item}</td>
						<td>{row.quantity}</td>
						<td>{money(row.total)}</td>
						<td>{money(row.gst)}</td>
						<td>{money(row.pst)}</td>
						<td>{money(row.dmt)}</td>
						<td>{money(row.liquor)}</td>
						<td>{money(other(row))}</td>
					</tr>
				{/each}
				<tr>
					<td>{group.code} subtotal</td>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					<td>{group.sums.quantity}</td>
					<td>{money(group.sums.total)}</td>
					<td>{money(group.sums.gst)}</td>
					<td>{money(group.sums.pst)}</td>
					<td>{money(group.sums.dmt)}</td>
					<td>{money(group.sums.liquor)}</td>
					<td>{money(group.sums.other)}</td>
				</tr>
			{:else}
				<tr><td colspan="12" class="small">No charge lines on this date.</td></tr>
			{/each}
			{#if data.rows.length}
				<tr>
					<td>Report Totals</td>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					<td>{totals.quantity}</td>
					<td>{money(totals.total)}</td>
					<td>{money(totals.gst)}</td>
					<td>{money(totals.pst)}</td>
					<td>{money(totals.dmt)}</td>
					<td>{money(totals.liquor)}</td>
					<td>{money(totals.other)}</td>
				</tr>
			{/if}
		</tbody>
	</table>
	<ReportFooter />
</ReportShell>
