<script lang="ts">
	import { goto } from '$app/navigation';
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import ReportDateInput from '$lib/components/app/report-date-input.svelte';
	import { dateShort, dayMonth } from '$lib/format.js';
	import { opsTabs } from '$lib/report-nav.js';

	let { data } = $props();

	function changeRange(from: string, to: string) {
		goto(`/reports/kitchen-filtered?from=${from}&to=${to}`);
	}
</script>

<svelte:head
	><title>Kitchen (range) · {dateShort(data.from)}–{dateShort(data.to)}</title></svelte:head
>

<ReportShell
	title="Weekly Kitchen Report — {dateShort(data.from)} to {dateShort(data.to)}"
	tabs={opsTabs(data.from, 'kitchen-filtered')}
	backHref="/print"
	backLabel="Print Center"
>
	{#snippet toolbar()}
		<ReportDateInput
			id="kitchen-from"
			label="From"
			value={data.from}
			onchange={(from) => changeRange(from, data.to)}
		/>
		<ReportDateInput
			id="kitchen-to"
			label="To"
			value={data.to}
			onchange={(to) => changeRange(data.from, to)}
		/>
	{/snippet}
	<div class="blackbar">Yellow Point Lodge</div>
	<h1>Weekly Kitchen Report</h1>
	<h3>Arrival Date between {dateShort(data.from)} and {dateShort(data.to)}</h3>
	<table class="ruled compact">
		<thead>
			<tr>
				<th>Last Name:</th>
				<th>First Name:</th>
				<th>Kitchen/Meal Notes:</th>
				<th>Arrive:</th>
				<th>Depart</th>
			</tr>
		</thead>
		<tbody>
			{#each data.rows as row, i (row.resnumber + '-' + i)}
				<tr>
					<td class="guest">{row.guestlastname}</td>
					<td class="guest">{row.guestfirstname ?? ''}</td>
					<td class="note">{row.kitchenmealnotes ?? ''}</td>
					<td class="date">{dayMonth(row.arrival_date)}</td>
					<td class="date">{dayMonth(row.departure_date)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</ReportShell>
