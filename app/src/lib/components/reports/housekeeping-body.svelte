<script lang="ts">
	import type { HousekeepingRow } from '$lib/data/types.js';
	import { dateShort, dayMonth } from '$lib/format.js';

	let {
		date,
		rows,
		totalGuests
	}: { date: string; rows: HousekeepingRow[]; totalGuests: number } = $props();
</script>

<div class="blackbar">Yellow Point Lodge</div>
<h1>Housekeeping Report</h1>
<h3>for {dateShort(date)}</h3>
<table class="ruled compact">
	<thead>
		<tr>
			<th>Room:</th>
			<th>Status:</th>
			<th>Guest:</th>
			<th>Count:</th>
			<th>In:</th>
			<th>Out:</th>
			<th>Note Date:</th>
			<th>Notes:</th>
		</tr>
	</thead>
	<tbody>
		{#each rows as row, i (row.resnumber + '-' + row.room + '-' + i)}
			<tr>
				<td>{row.room}</td>
				<td>{row.status}</td>
				<td class="guest">{row.guest}</td>
				<td>{row.guest_count ?? ''}</td>
				<td class="date">{dayMonth(row.in_date)}</td>
				<td class="date">{dayMonth(row.out_date)}</td>
				<!-- A note can date from an earlier stay, so its date keeps the year. -->
				<td class="date">{dateShort(row.note_date)}</td>
				<td class="note">{row.notes ?? ''}</td>
			</tr>
		{/each}
	</tbody>
</table>
<p><b>Total Guests</b>&nbsp;&nbsp; {totalGuests}</p>
