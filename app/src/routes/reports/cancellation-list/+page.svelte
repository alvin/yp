<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import ReportFooter from '$lib/components/app/report-footer.svelte';
	import { dateLong, dateShort } from '$lib/format.js';
	import { opsTabs } from '$lib/report-nav.js';

	let { data } = $props();
</script>

<svelte:head><title>Cancellations · {dateShort(data.date)}</title></svelte:head>

<ReportShell
	title="Cancellation List — {dateLong(data.date)}"
	tabs={opsTabs(data.date, 'cancellation-list')}
	date={data.date}
	backHref="/print"
	backLabel="Print Center"
>
	<div class="blackbar">Yellow Point Lodge</div>
	<h1>Cancellation List</h1>
	<h3>for {dateShort(data.date)}</h3>
	<table>
		<thead>
			<tr>
				<th>Res #</th>
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
					<td>{row.guest}</td>
					<td>{dateShort(row.arrival_date)}</td>
					<td>{dateShort(row.departure_date)}</td>
					<td>{row.rooms ?? ''}</td>
					<td>{row.notes ?? ''}</td>
				</tr>
			{:else}
				<tr><td colspan="6" class="small">No cancellations on this date.</td></tr>
			{/each}
		</tbody>
	</table>
	<ReportFooter />
</ReportShell>
