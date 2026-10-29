<script lang="ts">
	import type { InHouseCounts, InHouseRow } from '$lib/data/types.js';
	import { dateShort, dayMonth } from '$lib/format.js';

	let { date, rows, counts }: { date: string; rows: InHouseRow[]; counts: InHouseCounts } = $props();

	// The day in the order it runs. report_in_house returns rows in this order,
	// so the sections are already contiguous; an empty one is left out. A room
	// move prints under In House, as on Access's report.
	const ORDER = ['Arrive Today', 'In House', 'Depart Today'];
	const sections = $derived(
		ORDER.map((section) => ({ section, rows: rows.filter((r) => r.section === section) })).filter(
			(s) => s.rows.length
		)
	);
</script>

<div class="blackbar">Yellow Point Lodge</div>
<h1>In House Report</h1>
<h3>for {dateShort(date)}</h3>
<p>
	<b>Arrive Today</b> {counts.arrive_today} &nbsp;&nbsp; <b>Depart Today</b> {counts.depart_today}
	&nbsp;&nbsp; <b>In House</b> {counts.in_house} &nbsp;&nbsp;
	<b>Total Guests</b> {counts.total_guests}
</p>
{#each sections as s (s.section)}
	<h2 class="section">{s.section}</h2>
	<table class="ruled compact">
		<thead>
			<tr>
				<th>Res #:</th>
				<th>Guest:</th>
				<th>Arrival:</th>
				<th>Count:</th>
				<th>Room:</th>
				<th>In:</th>
				<th>Out:</th>
				<th>Occupancy Notes:</th>
			</tr>
		</thead>
		<tbody>
			{#each s.rows as row, i (row.resnumber + '-' + row.room + '-' + i)}
				<tr>
					<td>{row.resnumber}</td>
					<td class="guest">{row.guest}</td>
					<td>{row.arrival ?? ''}</td>
					<td>{row.guest_count ?? ''}</td>
					<td>{row.room}</td>
					<td class="date">{dayMonth(row.in_date)}</td>
					<td class="date">{dayMonth(row.out_date)}</td>
					<td class="note">{row.occupancy_notes ?? ''}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/each}

<style>
	.section {
		text-align: left;
		font-size: 19px;
		border-top: 2px solid #444;
		margin-top: 22px;
		padding-top: 8px;
	}
	.section:first-of-type {
		border-top: 0;
		margin-top: 12px;
	}
</style>
