<script lang="ts">
	import ReportFooter from '$lib/components/app/report-footer.svelte';
	import type { HousekeepingRow } from '$lib/data/types.js';
	import { dateShort } from '$lib/format.js';

	let { date, rows }: { date: string; rows: HousekeepingRow[] } = $props();
</script>

<div class="blackbar">Yellow Point Lodge</div>
<h1>Housekeeping Report</h1>
<h3>for {dateShort(date)}</h3>
<table>
	<thead>
		<tr>
			<th>Status:</th>
			<th>Res #:</th>
			<th>Guest:</th>
			<th>Count:</th>
			<th>Room:</th>
			<th>In:</th>
			<th>Out:</th>
			<th>Note Date:</th>
			<th>Notes:</th>
		</tr>
	</thead>
	<tbody>
		{#each rows as row, i (row.resnumber + '-' + row.room + '-' + i)}
			<tr>
				<td>{row.status}</td>
				<td>{row.resnumber}</td>
				<td>{row.guest}</td>
				<td>{row.guest_count ?? ''}</td>
				<td>{row.room}</td>
				<td>{dateShort(row.in_date)}</td>
				<td>{dateShort(row.out_date)}</td>
				<td>{dateShort(row.note_date)}</td>
				<td class="note">{row.notes ?? ''}</td>
			</tr>
		{/each}
	</tbody>
</table>
<ReportFooter />
