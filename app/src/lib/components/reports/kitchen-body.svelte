<script lang="ts">
	import type { KitchenMealRow } from '$lib/data/types.js';
	import { dateShort, dayMonth } from '$lib/format.js';

	let {
		date,
		rows,
		totalGuests,
		allergyOnly = false
	}: {
		date: string;
		rows: KitchenMealRow[];
		totalGuests: number;
		/** Screen-only view mode; when true only rows with allergy notes show. */
		allergyOnly?: boolean;
	} = $props();

	const visibleRows = $derived(
		allergyOnly ? rows.filter((r) => /allerg/i.test(r.diet_notes ?? '')) : rows
	);
</script>

<div class="blackbar">Yellow Point Lodge</div>
<h1>Daily Kitchen/Meal Report</h1>
<h3>for {dateShort(date)}{allergyOnly ? ' — Allergy only' : ''}</h3>
<table class="ruled compact">
	<thead>
		<tr>
			<th>Guest:</th>
			<th>Arrival Date:</th>
			<th>Departure Date:</th>
			<th>Guest Diet/Kitchen/Meal Notes:</th>
		</tr>
	</thead>
	<tbody>
		{#each visibleRows as row, i (row.resnumber + '-' + i)}
			<tr>
				<td class="guest">{row.guest}</td>
				<td class="date">{dayMonth(row.arrival_date)}</td>
				<td class="date">{dayMonth(row.departure_date)}</td>
				<td class="note">{row.diet_notes ?? ''}</td>
			</tr>
		{/each}
	</tbody>
</table>
{#if !allergyOnly}
	<p><b>Total Guests</b>&nbsp;&nbsp; {totalGuests}</p>
{/if}
