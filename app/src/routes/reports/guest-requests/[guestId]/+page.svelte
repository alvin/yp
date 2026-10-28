<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import ReportFooter from '$lib/components/app/report-footer.svelte';
	import { dateShort, guestName } from '$lib/format.js';

	let { data } = $props();
	const name = $derived(guestName(data.guest));
</script>

<svelte:head><title>Requests · {name}</title></svelte:head>

<ReportShell
	title="Requests — {name}"
	orientation="landscape"
	backHref={data.back}
	backLabel="Back"
>
	<div class="blackbar">Yellow Point Lodge</div>
	<h1>Requests</h1>
	<h3>{name}</h3>
	<table class="ruled">
		<thead>
			<tr>
				<th>Res #:</th>
				<th>Arrival:</th>
				<th>Departure:</th>
				<th>Room:</th>
				<th>Requests:</th>
			</tr>
		</thead>
		<tbody>
			{#each data.rows as row (row.resnumber)}
				<tr>
					<td>{row.resnumber}</td>
					<td class="date">{dateShort(row.arrival_date)}</td>
					<td class="date">{dateShort(row.departure_date)}</td>
					<td>{row.rooms ?? ''}</td>
					<td class="note">{row.request}</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<ReportFooter />
</ReportShell>
