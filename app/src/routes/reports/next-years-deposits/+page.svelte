<script lang="ts">
	import { goto } from '$app/navigation';
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import ReportFooter from '$lib/components/app/report-footer.svelte';
	import { Combobox } from '$lib/components/ui/combobox/index.js';
	import { TODAY } from '$lib/data/queries.js';
	import { money } from '$lib/format.js';

	let { data } = $props();

	const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const thisYear = Number(TODAY.slice(0, 4));
	const years = Array.from({ length: 6 }, (_, i) => String(thisYear - i)).map((y) => ({
		value: y,
		label: y
	}));

	const sum = (key: 'deposits' | 'received' | 'refunded' | 'kept' | 'held') =>
		data.rows.reduce((s, r) => s + Number(r[key]), 0);
</script>

<svelte:head><title>Next Year's Deposits · {data.year}</title></svelte:head>

<ReportShell title="Next Year's Deposits — {data.year}" backHref="/print" backLabel="Print Center">
	{#snippet toolbar()}
		<label class="text-muted-foreground text-xs" for="report-year">Year</label>
		<Combobox
			id="report-year"
			value={String(data.year)}
			options={years}
			class="h-8 w-24"
			onchange={(y) => goto(`/reports/next-years-deposits?year=${y}`)}
		/>
	{/snippet}
	<div class="blackbar">Yellow Point Lodge</div>
	<h1>Next Year's Deposits</h1>
	<h3>Received January 1 – December 31, {data.year}, for stays after {data.year}</h3>
	<table>
		<thead>
			<tr>
				<th>Month:</th>
				<th class="money">Deposits:</th>
				<th class="money">Received:</th>
				<th class="money">Refunded:</th>
				<th class="money">Kept:</th>
				<th class="money">Held:</th>
			</tr>
		</thead>
		<tbody>
			{#each data.rows as row, i (row.month)}
				<tr>
					<td>{MONTHS[i]}</td>
					<td class="money">{row.deposits}</td>
					<td class="money">{money(row.received)}</td>
					<td class="money">{money(row.refunded)}</td>
					<td class="money">{money(row.kept)}</td>
					<td class="money">{money(row.held)}</td>
				</tr>
			{/each}
			<tr class="total">
				<td>Total</td>
				<td class="money">{sum('deposits').toLocaleString('en-CA')}</td>
				<td class="money">{money(sum('received'))}</td>
				<td class="money">{money(sum('refunded'))}</td>
				<td class="money">{money(sum('kept'))}</td>
				<td class="money">{money(sum('held'))}</td>
			</tr>
		</tbody>
	</table>
	<p class="right">
		<b>Held at December 31, {data.year}:</b>&nbsp;&nbsp; <b>{money(sum('held'))}</b>
	</p>
	<ReportFooter />
</ReportShell>
