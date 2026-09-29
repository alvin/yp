<script lang="ts">
	import type { FolioReceipt, FolioReport, StayRoomRow } from '$lib/data/types.js';
	import { dateShort, money } from '$lib/format.js';
	import { LODGE_PHONE } from '$lib/data/reference.js';
	import GuestLetterhead from './guest-letterhead.svelte';

	let {
		r,
		rooms = [],
		receipts = []
	}: { r: FolioReport; rooms?: StayRoomRow[]; receipts?: FolioReceipt[] } = $props();

	const vehicle = $derived(
		[r.vehicle_description, r.vehicle_license_plate].filter(Boolean).join(' ')
	);

	// The diet and housekeeping notes sit in the space above Vehicle.
	const notes = $derived(Boolean(r.diet_notes || r.housekeeping_notes));

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
<GuestLetterhead names={r.guest_names ?? r.guest} to={r}>
	{dateShort(r.date_printed)}<br /><br />
	{#if r.phone}{r.phone}<br />{/if}
	Res. No. {r.resnumber}
</GuestLetterhead>
<div class="rule"></div>
<div class="large-line">
	<span>Arrival: {dateShort(r.arrival_date)}</span><span
		>Departure: {dateShort(r.departure_date)}</span
	>
</div>
<table>
	<tbody>
		{#each stayRooms as o, n (o.occupancyid)}
			<tr>
				<td>{#if n === 0}<b>Room:</b><br />{/if}{o.room}</td>
				<td>{#if n === 0}<b>In:</b><br />{/if}{dateShort(o.in_date)}</td>
				<td>{#if n === 0}<b>Out:</b><br />{/if}{dateShort(o.out_date)}</td>
				<td>{#if n === 0}<b># Guests</b><br />{/if}{o.guest_count}</td>
			</tr>
		{/each}
	</tbody>
</table>
{#if receipts.length}
	<table>
		<tbody>
			{#each receipts as p (p.paymentid)}
				<tr>
					<td>{p.category}{#if p.paymenttype}<br />{p.paymenttype}{/if}</td>
					<td class="money"><b>{money(p.amount)}</b></td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
{#if notes}
	<div class="notes-room" style="--standoff: 120px">
		{#if r.diet_notes}
			<p><b>Diet:</b>&nbsp;<span class="note">{r.diet_notes}</span></p>
		{/if}
		{#if r.housekeeping_notes}
			<p><b>Housekeeping:</b>&nbsp;<span class="note">{r.housekeeping_notes}</span></p>
		{/if}
	</div>
{/if}
<p class="standoff" style="--standoff: {notes ? 0 : 120}px"><b>Vehicle:</b>{#if vehicle}&nbsp;{vehicle}{/if}</p>
<p class="standoff" style="--standoff: 330px">
	Signature:<span class="blank" style="min-width: 720px"></span>
</p>
<p class="center standoff" style="--standoff: 70px; font-family: Georgia, serif; font-size: 24px">
	Phone {LODGE_PHONE}
</p>
