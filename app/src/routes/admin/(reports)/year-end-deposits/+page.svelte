<script lang="ts">
	import { goto } from '$app/navigation';
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import ReportDateInput from '$lib/components/app/report-date-input.svelte';
	import { MONTHS_LONG, dateLong, dateShort, money } from '$lib/format.js';
	import HelpSheet from '$lib/components/app/help-sheet.svelte';
	import { HELP } from '$lib/admin-help.js';

	let { data } = $props();

	// A calendar year reads as the year end always has.
	const year = $derived(
		data.from.slice(0, 4) === data.to.slice(0, 4) &&
			data.from.slice(5) === '01-01' &&
			data.to.slice(5) === '12-31'
			? data.from.slice(0, 4)
			: null
	);
	const range = $derived(year ?? `${dateShort(data.from)} to ${dateShort(data.to)}`);
	const oneYear = $derived(data.from.slice(0, 4) === data.to.slice(0, 4));

	function monthName(month: string): string {
		const name = MONTHS_LONG[Number(month.slice(5, 7)) - 1];
		return oneYear ? name : `${name} ${month.slice(0, 4)}`;
	}

	function changeRange(from: string, to: string) {
		goto(`/admin/year-end-deposits?from=${from}&to=${to}`);
	}

	const sum = (key: 'deposits' | 'received' | 'refunded' | 'kept' | 'held') =>
		data.rows.reduce((s, r) => s + Number(r[key]), 0);
</script>

<svelte:head><title>Next Year's Deposits · {range}</title></svelte:head>

<ReportShell title="Next Year's Deposits — {range}">
	{#snippet toolbar()}
		<ReportDateInput
			id="deposits-from"
			label="From"
			value={data.from}
			onchange={(from) => changeRange(from, data.to)}
		/>
		<ReportDateInput
			id="deposits-to"
			label="To"
			value={data.to}
			onchange={(to) => changeRange(data.from, to)}
		/>
		<HelpSheet help={HELP.yearEnd} class="size-8" />
	{/snippet}
	<div class="blackbar">Yellow Point Lodge</div>
	<h1>Next Year's Deposits</h1>
	{#if year}
		<h3>Received January 1 – December 31, {year}, for stays after {year}</h3>
	{:else}
		<h3>Received {dateLong(data.from)} – {dateLong(data.to)}, for stays after {dateLong(data.to)}</h3>
	{/if}
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
			{#each data.rows as row (row.month)}
				<tr>
					<td>{monthName(row.month)}</td>
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
		<b>Held at {dateLong(data.to)}:</b>&nbsp;&nbsp; <b>{money(sum('held'))}</b>
	</p>
</ReportShell>
