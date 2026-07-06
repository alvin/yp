<script lang="ts">
	import type { ConfirmationReport } from '$lib/data/types.js';
	import { dateShort, money } from '$lib/format.js';

	let { r }: { r: ConfirmationReport } = $props();

	// "VICTORIA, BC CAN" — city, region then country, as on the original slip.
	const cityLine = $derived(
		[[r.guestcity, r.guestregion].filter(Boolean).join(', '), r.guestcountry]
			.filter(Boolean)
			.join(' ')
	);
</script>

<div class="logo">Yellow Point Lodge</div>
<div class="letterhead">
	<div style="text-transform: uppercase">
		{#each (r.guest_names ?? r.guest).split('\n') as guest_line (guest_line)}{guest_line}<br />{/each}
		{#if r.guestaddress}{r.guestaddress}<br />{/if}
		{#if cityLine}{cityLine}<br />{/if}
		{#if r.guestpczip}{r.guestpczip}{/if}
	</div>
	<div class="right">
		Date Printed:&nbsp; {dateShort(r.date_printed)}<br />
		Date Confirmed:&nbsp; {dateShort(r.date_confirmed)}<br />
		{#if r.phone}{r.phone}<br />{/if}
		Res. No. {r.resnumber}
	</div>
</div>
<div class="rule"></div>
<p class="center">
	Thank you for your reservation. Please check the information below for accuracy<br />and
	call us immediately if there are any problems.
</p>
<div class="large-line">
	<span>Arrival:&nbsp; {dateShort(r.arrival_date)}</span><span
		>Departure:&nbsp; {dateShort(r.departure_date)}</span
	>
</div>
<table>
	<tbody>
		<tr>
			<td><b>Room:</b> {r.room}</td>
			<td><b>In:</b> {dateShort(r.in_date ?? r.arrival_date)}</td>
			<td><b>Out:</b> {dateShort(r.out_date ?? r.departure_date)}</td>
			<td><b># Guests</b> {r.guest_count}</td>
		</tr>
	</tbody>
</table>
{#if r.reservation_notes}
	<p class="center note">{r.reservation_notes}</p>
{/if}
{#if r.deposit_amount != null}
	<table>
		<tbody>
			<tr>
				<td>Deposit (Received)</td>
				<td class="money">{money(r.deposit_amount)}</td>
				<td class="right">{dateShort(r.deposit_date)}</td>
			</tr>
		</tbody>
	</table>
{/if}
<p class="center" style="margin-top: 190px">
	Our office is open from 8:00 AM to 10:30 PM every day for your calls.<br />Please check out
	the information on the back of this confirmation.<br />We look forward to your visit.
</p>
<p class="center" style="margin-top: 210px; font-family: Georgia, serif; font-size: 24px">
	Phone (250) 245-7422
</p>
