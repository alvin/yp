<script lang="ts">
	import type { CancellationReport } from '$lib/data/types.js';
	import { dateShort, money } from '$lib/format.js';
	import { LODGE_PHONE } from '$lib/data/reference.js';
	import GuestLetterhead from './guest-letterhead.svelte';

	let { r }: { r: CancellationReport } = $props();
</script>

<div class="logo">Yellow Point Lodge</div>
<h1 style="letter-spacing: 0.45em">CANCELLATION</h1>
<GuestLetterhead name={r.guest} to={r}>
	Date Printed: {dateShort(r.date_printed)}<br />
	Date Cancelled: {dateShort(r.date_cancelled)}<br />
	{#if r.phone}{r.phone}<br />{/if}
	Res. No. {r.resnumber}
</GuestLetterhead>
<p class="center standoff" style="--standoff: 55px">
	We are sorry that you won't be able to visit us. Please check the information<br />below for
	accuracy and call us immediately if there are any problems.
</p>
<div class="large-line">
	<span>Arrival: {dateShort(r.arrival_date)}</span><span
		>Departure: {dateShort(r.departure_date)}</span
	>
</div>
<table>
	<tbody>
		<tr>
			<td><b>Room:</b> {r.room}</td>
			<td><b># Guests</b> {r.guest_count}</td>
		</tr>
	</tbody>
</table>
{#if r.deposit_received_amount != null || r.deposit_outcome_category}
	<table>
		<tbody>
			{#if r.deposit_received_amount != null}
				<tr>
					<td>Deposit (Received)</td>
					<td class="money">{money(r.deposit_received_amount)}</td>
					<td class="right">{dateShort(r.deposit_received_date)}</td>
				</tr>
			{/if}
			{#if r.deposit_outcome_category}
				<tr>
					<td>{r.deposit_outcome_category}</td>
					<td class="money">({money(Math.abs(r.deposit_outcome_amount ?? 0))})</td>
					<td class="right">{dateShort(r.deposit_outcome_date)}</td>
				</tr>
			{/if}
		</tbody>
	</table>
{/if}
{#if r.cancellation_notes}
	<p class="note">{r.cancellation_notes}</p>
{/if}
<p class="center standoff" style="--standoff: 120px">
	Our office is open from 8:00 AM to 10:30 PM every day for your calls.<br />We hope we will be
	able to welcome you again soon.
</p>
<p class="center standoff" style="--standoff: 250px; font-family: Georgia, serif; font-size: 24px">
	Phone {LODGE_PHONE}
</p>
