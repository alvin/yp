<script lang="ts">
	import ReportFooter from '$lib/components/app/report-footer.svelte';
	import type { InHouseRow } from '$lib/data/types.js';
	import { dateShort } from '$lib/format.js';

	let { date, rows }: { date: string; rows: InHouseRow[] } = $props();

	const arriveToday = $derived(rows.filter((r) => r.section === 'Arrive Today').length);
	const departToday = $derived(rows.filter((r) => r.section === 'Depart Today').length);
	const inHouse = $derived(rows.filter((r) => r.section === 'In House').length);
	const totalGuests = $derived(rows.reduce((sum, r) => sum + (r.guest_count ?? 0), 0));

	// The day in the order it runs. report_in_house returns rows in this order,
	// so the sections are already contiguous; an empty one is left out.
	const ORDER = ['Arrive Today', 'Move In', 'In House', 'Depart Today'];
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
	<b>Arrive Today</b> {arriveToday} &nbsp;&nbsp; <b>Depart Today</b> {departToday}
	&nbsp;&nbsp; <b>In House</b> {inHouse} &nbsp;&nbsp;
	<b>Total Guests</b> {totalGuests}
</p>
{#each sections as s (s.section)}
	<h2 class="section">{s.section}</h2>
	<table>
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
					<td>{row.guest}</td>
					<td>{row.arrival ?? ''}</td>
					<td>{row.guest_count ?? ''}</td>
					<td>{row.room}</td>
					<td>{dateShort(row.in_date)}</td>
					<td>{dateShort(row.out_date)}</td>
					<td class="note">{row.occupancy_notes ?? ''}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/each}
<ReportFooter />

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
