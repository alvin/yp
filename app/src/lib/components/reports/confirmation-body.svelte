<script lang="ts">
	import type { ConfirmationReport, StayRoomRow } from '$lib/data/types.js';
	import { dateShort, money } from '$lib/format.js';

	let { r, rooms = [] }: { r: ConfirmationReport; rooms?: StayRoomRow[] } = $props();

	// "VICTORIA, BC CAN" — city, region then country, as on the original slip.
	const cityLine = $derived(
		[[r.guestcity, r.guestregion].filter(Boolean).join(', '), r.guestcountry]
			.filter(Boolean)
			.join(' ')
	);

	// A stay that never moves rooms prints the one row it always did; a stay
	// that moves prints a row per room, in the order it occupies them.
	const stayRooms = $derived(
		rooms.length
			? rooms
			: [
					{
						occupancyid: 0,
						room: r.room ?? '',
						in_date: r.in_date ?? r.arrival_date,
						out_date: r.out_date ?? r.departure_date,
						guest_count: r.guest_count
					}
				]
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
		{#each stayRooms as o, n (o.occupancyid)}
			<tr>
				<td>{#if n === 0}<b>Room:</b>{/if} {o.room}</td>
				<td>{#if n === 0}<b>In:</b>{/if} {dateShort(o.in_date)}</td>
				<td>{#if n === 0}<b>Out:</b>{/if} {dateShort(o.out_date)}</td>
				<td>{#if n === 0}<b># Guests</b>{/if} {o.guest_count}</td>
			</tr>
		{/each}
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
<p class="center standoff" style="--standoff: 190px">
	Our office is open from 8:00 AM to 10:30 PM every day for your calls.<br />Please check out
	the information on the back of this confirmation.<br />We look forward to your visit.
</p>
<p class="center standoff" style="--standoff: 210px; font-family: Georgia, serif; font-size: 24px">
	Phone (250) 245-7422
</p>
