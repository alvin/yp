<script lang="ts">
	import ReportFooter from '$lib/components/app/report-footer.svelte';
	import type { InHouseRow } from '$lib/data/types.js';
	import { dateShort } from '$lib/format.js';

	let { date, rows }: { date: string; rows: InHouseRow[] } = $props();

	const arriveToday = $derived(rows.filter((r) => r.section === 'Arrive Today').length);
	const departToday = $derived(rows.filter((r) => r.section === 'Depart Today').length);
	const inHouse = $derived(rows.filter((r) => r.section === 'In House').length);
	const totalGuests = $derived(rows.reduce((sum, r) => sum + (r.guest_count ?? 0), 0));
</script>

<div class="blackbar">Yellow Point Lodge</div>
<h1>In House Report</h1>
<h3>for {dateShort(date)}</h3>
<p>
	<b>Arrive Today</b> {arriveToday} &nbsp;&nbsp; <b>Depart Today</b> {departToday}
	&nbsp;&nbsp; <b>In House</b> {inHouse} &nbsp;&nbsp;
	<b>Total Guests</b> {totalGuests}
</p>
<table>
	<thead>
		<tr>
			<th>Section</th>
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
		{#each rows as row, i (row.resnumber + '-' + row.room + '-' + i)}
			<tr>
				<td>{row.section}</td>
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
<ReportFooter />
