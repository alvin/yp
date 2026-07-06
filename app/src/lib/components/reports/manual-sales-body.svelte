<script lang="ts">
	import ReportFooter from '$lib/components/app/report-footer.svelte';
	import type { ManualSalesRow } from '$lib/data/types.js';
	import { dateShort } from '$lib/format.js';

	let { date, rows }: { date: string; rows: ManualSalesRow[] } = $props();
</script>

<div class="blackbar">Yellow Point Lodge</div>
<h1>Manual Sales List</h1>
<h3>for {dateShort(date)}</h3>
<p class="center small">
	Checkbox beside Res # is visual check for Cancelled Reservations. If check appears, res is
	cancelled. Report should filter out cancelled reservations.
</p>
<table>
	<thead>
		<tr>
			<th>Room</th>
			<th>Res #</th>
			<th>Guest</th>
			<th>Room Order</th>
		</tr>
	</thead>
	<tbody>
		{#each rows as row, i (row.resnumber + '-' + row.room + '-' + i)}
			<tr>
				<td>{row.room}</td>
				<td>{row.is_cancelled ? '☑' : '☐'} {row.resnumber}</td>
				<td>{row.guest_last_name}</td>
				<td>{row.room_order ?? ''}</td>
			</tr>
		{/each}
	</tbody>
</table>
<ReportFooter />
