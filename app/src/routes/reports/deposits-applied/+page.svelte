<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import ReportFooter from '$lib/components/app/report-footer.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { dateLong, dateShort, money } from '$lib/format.js';
	import { dailyCashTabs } from '$lib/report-nav.js';

	let { data } = $props();
	const total = $derived(data.rows.reduce((s, r) => s + (r.pymt_cdn ?? 0), 0));
	const agrees = $derived(Math.abs(total - data.dcar_line) < 0.005);
</script>

<svelte:head><title>Deposits applied · {dateShort(data.date)}</title></svelte:head>

<ReportShell
	title="Deposits Applied — {dateLong(data.date)}"
	backHref="/reports/dcar?date={data.date}"
	backLabel="Daily Cash"
	tabs={dailyCashTabs(data.date, 'deposits-applied')}
	date={data.date}
>
	{#snippet toolbar()}
		{#if agrees}
			<Badge variant="success">Ties to DCAR 'Deposit (Applied)' line · ✓ Agrees</Badge>
		{:else}
			<Badge variant="warning">✗ Differs from DCAR line by {money(Math.abs(total - data.dcar_line))}</Badge>
		{/if}
	{/snippet}
	<div class="blackbar">Yellow Point Lodge</div>
	<h1>Deposits Applied</h1>
	<h3>for {dateShort(data.date)}, by Payment Type</h3>
	<table>
		<thead>
			<tr>
				<th>Payment Type</th>
				<th>Res #:</th>
				<th>Last Name:</th>
				<th>First Name:</th>
				<th>Pymt Amt:</th>
				<th>Funds:</th>
				<th>Pymt CDN:</th>
			</tr>
		</thead>
		<tbody>
			{#each data.rows as row, i (row.resnumber + '-' + i)}
				<tr>
					<td>{row.payment_type}</td>
					<td>{row.resnumber}</td>
					<td>{row.guestlastname}</td>
					<td>{row.guestfirstname ?? ''}</td>
					<td>{money(row.pymt_amount)}</td>
					<td>{row.funds}</td>
					<td>{money(row.pymt_cdn)}</td>
				</tr>
			{:else}
				<tr><td colspan="7" class="small">No deposits applied on this date.</td></tr>
			{/each}
		</tbody>
	</table>
	<p class="right">
		<b>Total Deposits Applied:</b>&nbsp;&nbsp; <b>{money(total)}</b>
	</p>
	<ReportFooter />
</ReportShell>
