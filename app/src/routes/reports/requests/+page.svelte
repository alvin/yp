<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import ReportFooter from '$lib/components/app/report-footer.svelte';
	import { dateShort } from '$lib/format.js';
	import { opsTabs } from '$lib/report-nav.js';

	let { data } = $props();
</script>

<svelte:head><title>Requests · {dateShort(data.date)}</title></svelte:head>

<ReportShell
	title="Requests — {dateShort(data.date)}"
	orientation="landscape"
	tabs={opsTabs(data.date, 'requests')}
	date={data.date}
	backHref="/print"
	backLabel="Print Center"
>
	<div class="blackbar">Yellow Point Lodge</div>
	<h1>Requests</h1>
	<h3>for {dateShort(data.date)}</h3>
	<table class="ruled">
		<thead>
			<tr>
				<th>Res #:</th>
				<th>Guest:</th>
				<th>Room:</th>
				<th>Arrival:</th>
				<th>Departure:</th>
				<th>Requests:</th>
			</tr>
		</thead>
		<tbody>
			{#each data.rows as row (row.resnumber)}
				<tr>
					<td>{row.resnumber}</td>
					<td>{row.guest}</td>
					<td>{row.rooms}</td>
					<td>{dateShort(row.arrival_date)}</td>
					<td>{dateShort(row.departure_date)}</td>
					<td class="note">{row.request}</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<ReportFooter />
</ReportShell>
