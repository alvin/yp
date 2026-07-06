<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import ReportFooter from '$lib/components/app/report-footer.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { dateLong, dateShort, moneyAcct as money } from '$lib/format.js';
	import { dailyCashTabs } from '$lib/report-nav.js';
	import type { CashierDetailRow } from '$lib/data/types.js';

	let { data } = $props();

	// Rows arrive ordered by payment_type; group consecutive rows for subtotals.
	const groups = $derived.by(() => {
		const out: { type: string; rows: CashierDetailRow[]; subtotal: number }[] = [];
		for (const row of data.rows) {
			const last = out[out.length - 1];
			if (last && last.type === row.payment_type) {
				last.rows.push(row);
				last.subtotal += row.amount;
			} else {
				out.push({ type: row.payment_type, rows: [row], subtotal: row.amount });
			}
		}
		return out;
	});
	const total = $derived(data.rows.reduce((s, r) => s + r.amount, 0));
	const agrees = $derived(Math.abs(total - data.receipts_total) < 0.005);
</script>

<svelte:head><title>Cashier detail · {dateShort(data.date)}</title></svelte:head>

<ReportShell
	title="Cashier Detail — {dateLong(data.date)}"
	backHref="/reports/dcar?date={data.date}"
	backLabel="Daily Cash"
	tabs={dailyCashTabs(data.date, 'cashier-detail')}
	date={data.date}
>
	{#snippet toolbar()}
		{#if agrees}
			<Badge variant="success">Ties to DCAR 'Total Receipts Today' · ✓ Agrees</Badge>
		{:else}
			<Badge variant="warning">✗ Differs from DCAR line by {money(Math.abs(total - data.receipts_total))}</Badge>
		{/if}
	{/snippet}
	<div class="blackbar">Yellow Point Lodge</div>
	<h1>Cashier Detail</h1>
	<h3>for {dateShort(data.date)}</h3>
	<table>
		<thead>
			<tr>
				<th>Payment Type</th>
				<th>Res #:</th>
				<th>Pymt Date:</th>
				<th>Pymt Category:</th>
				<th>Amount:</th>
				<th>Guest:</th>
			</tr>
		</thead>
		<tbody>
			{#each groups as group (group.type)}
				{#each group.rows as row, i (row.resnumber + '-' + i)}
					<tr>
						<td>{row.payment_type}</td>
						<td>{row.resnumber}</td>
						<td>{dateShort(row.pymt_date)}</td>
						<td>{row.pymt_category}</td>
						<td>{money(row.amount)}</td>
						<td>{row.guest}</td>
					</tr>
				{/each}
				<tr>
					<td>{group.type} Subtotal</td>
					<td></td>
					<td></td>
					<td></td>
					<td>{money(group.subtotal)}</td>
					<td></td>
				</tr>
			{:else}
				<tr><td colspan="6" class="small">No cashier activity on this date.</td></tr>
			{/each}
			{#if data.rows.length}
				<tr>
					<td>Total</td>
					<td></td>
					<td></td>
					<td></td>
					<td>{money(total)}</td>
					<td></td>
				</tr>
			{/if}
		</tbody>
	</table>
	<ReportFooter />
</ReportShell>
