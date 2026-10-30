<script lang="ts">
	// The Items Cashed Out table: lines by inventory code, a subtotal for each
	// code and the report's totals. The daily appendix prints one day; the
	// admin area's sales report prints a range of days, with the day each line
	// was cashed out.
	import { dateShort, money } from '$lib/format.js';
	import type { ItemsCashedOutRow, ItemsSoldRow } from '$lib/data/types.js';

	let {
		rows,
		showDate = false,
		empty = 'No charge lines on this date.'
	}: {
		rows: (ItemsCashedOutRow | ItemsSoldRow)[];
		showDate?: boolean;
		empty?: string;
	} = $props();

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
		const out: { code: string; rows: (ItemsCashedOutRow | ItemsSoldRow)[]; sums: Sums }[] = [];
		for (const row of rows) {
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
		for (const row of rows) add(sums, row);
		return sums;
	});
	const columns = $derived(showDate ? 13 : 12);
</script>

<table>
	<thead>
		<tr>
			<th>Inv Code</th>
			{#if showDate}<th>Date:</th>{/if}
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
					{#if showDate}<td class="date">{dateShort((row as ItemsSoldRow).cashed_out)}</td>{/if}
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
				{#if showDate}<td></td>{/if}
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
			<tr><td colspan={columns} class="small">{empty}</td></tr>
		{/each}
		{#if rows.length}
			<tr>
				<td>Report Totals</td>
				{#if showDate}<td></td>{/if}
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
