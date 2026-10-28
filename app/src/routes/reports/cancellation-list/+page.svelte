<script lang="ts">
	import { goto } from '$app/navigation';
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import ReportFooter from '$lib/components/app/report-footer.svelte';
	import ReportDateInput from '$lib/components/app/report-date-input.svelte';
	import { dateShort } from '$lib/format.js';

	let { data } = $props();

	function changeRange(from: string, to: string) {
		goto(`/reports/cancellation-list?from=${from}&to=${to}`);
	}
</script>

<svelte:head
	><title>Cancellations · {dateShort(data.from)}–{dateShort(data.to)}</title></svelte:head
>

<ReportShell
	title="Cancellation List — {dateShort(data.from)} to {dateShort(data.to)}"
	backHref="/print"
	backLabel="Print Center"
>
	{#snippet toolbar()}
		<ReportDateInput
			id="cancellations-from"
			label="From"
			value={data.from}
			onchange={(from) => changeRange(from, data.to)}
		/>
		<ReportDateInput
			id="cancellations-to"
			label="To"
			value={data.to}
			onchange={(to) => changeRange(data.from, to)}
		/>
	{/snippet}
	<div class="blackbar">Yellow Point Lodge</div>
	<h1>Cancellation List</h1>
	<h3>Cancelled between {dateShort(data.from)} and {dateShort(data.to)}</h3>
	<table class="ruled">
		<thead>
			<tr>
				<th>Res #</th>
				<th>Cancelled:</th>
				<th>Guest:</th>
				<th>Arrival:</th>
				<th>Departure:</th>
				<th>Room:</th>
				<th>Notes:</th>
			</tr>
		</thead>
		<tbody>
			{#each data.rows as row (row.resnumber)}
				<tr>
					<td>{row.resnumber}</td>
					<td class="date">{dateShort(row.date_cancelled)}</td>
					<td>{row.guest}</td>
					<td class="date">{dateShort(row.arrival_date)}</td>
					<td class="date">{dateShort(row.departure_date)}</td>
					<td>{row.rooms ?? ''}</td>
					<td class="note">{row.notes ?? ''}</td>
				</tr>
			{:else}
				<tr><td colspan="7" class="small">No cancellations in these dates.</td></tr>
			{/each}
		</tbody>
	</table>
	<ReportFooter />
</ReportShell>
