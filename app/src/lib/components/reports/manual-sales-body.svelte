<script lang="ts">
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
<!-- A sheet to write on: the desk notes each room's sales by hand at busy
     times (drinks before dinner) and enters them later, so Items takes the
     width and each line is tall enough to write in. -->
<table class="ruled sheet">
	<thead>
		<tr>
			<th class="room">Room</th>
			<th class="guest">Guest</th>
			<th class="items">Items</th>
		</tr>
	</thead>
	<tbody>
		{#each rows as row, i (row.resnumber + '-' + row.room + '-' + i)}
			<tr>
				<td class="room">
					{row.room}
					<div class="resno">{row.is_cancelled ? '☑' : '☐'} {row.resnumber}</div>
				</td>
				<td class="guest">{row.guest_last_name}</td>
				<td class="items"></td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.sheet th.room,
	.sheet td.room {
		width: 120px;
	}
	.sheet th.guest,
	.sheet td.guest {
		width: 190px;
	}
	.sheet td {
		height: 52px;
	}
	.sheet .resno {
		font-size: 11px;
		color: #444;
		margin-top: 2px;
		white-space: nowrap;
	}
	/* Ruled like the lines, so it holds on paper as well as on screen. */
	.sheet th.items,
	.sheet td.items {
		border-left: 1px solid #777;
	}
</style>
