<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import ReportFooter from '$lib/components/app/report-footer.svelte';
	import DailyCashTie from '$lib/components/app/daily-cash-tie.svelte';
	import { dateLong, dateShort, money } from '$lib/format.js';
	import { dailyCashTabs } from '$lib/report-nav.js';
	import type { DepositReportRow } from '$lib/data/types.js';

	// The Deposits Received and Deposits Applied appendices are one report,
	// each listing its own side of the day's deposits.
	let {
		kind,
		date,
		rows,
		dcarLine
	}: {
		kind: 'Received' | 'Applied';
		date: string;
		rows: DepositReportRow[];
		/** The Daily Cash line this appendix ties to. */
		dcarLine: number;
	} = $props();

	const word = $derived(kind.toLowerCase());
	const total = $derived(rows.reduce((s, r) => s + r.pymt_cdn, 0));
</script>

<svelte:head><title>Deposits {word} · {dateShort(date)}</title></svelte:head>

<ReportShell
	title="Deposits {kind} — {dateLong(date)}"
	backHref="/reports/dcar?date={date}"
	backLabel="Daily Cash"
	tabs={dailyCashTabs(date, `deposits-${word}`)}
	{date}
>
	{#snippet toolbar()}
		<DailyCashTie {total} dcar={dcarLine} />
	{/snippet}
	<div class="blackbar">Yellow Point Lodge</div>
	<h1>Deposits {kind}</h1>
	<h3>for {dateShort(date)}, by Payment Type</h3>
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
			{#each rows as row, i (row.resnumber + '-' + i)}
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
				<tr><td colspan="7" class="small">No deposits {word} on this date.</td></tr>
			{/each}
		</tbody>
	</table>
	<p class="right">
		<b>Total Deposits {kind}:</b>&nbsp;&nbsp; <b>{money(total)}</b>
	</p>
	<ReportFooter />
</ReportShell>
