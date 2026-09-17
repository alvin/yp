<script lang="ts">
	import type { FolioReceipt, FolioReport, StayRoomRow } from '$lib/data/types.js';
	import { dateShort, money } from '$lib/format.js';

	let {
		r,
		rooms = [],
		receipts = []
	}: { r: FolioReport; rooms?: StayRoomRow[]; receipts?: FolioReceipt[] } = $props();

	// "PORT MOODY, BC CAN" — city, region then country, as on the original folio.
	const cityLine = $derived(
		[[r.guestcity, r.guestregion].filter(Boolean).join(', '), r.guestcountry]
			.filter(Boolean)
			.join(' ')
	);

	const vehicle = $derived(
		[r.vehicle_description, r.vehicle_license_plate].filter(Boolean).join(' ')
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
		{dateShort(r.date_printed)}<br /><br />
		{#if r.phone}{r.phone}<br />{/if}
		Res. No. {r.resnumber}
	</div>
</div>
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
{#if r.diet_notes}
	<p><b>Diet:</b>&nbsp;<span class="note">{r.diet_notes}</span></p>
{/if}
<p class="standoff" style="--standoff: 120px"><b>Vehicle:</b>{#if vehicle}&nbsp;{vehicle}{/if}</p>
<p class="standoff" style="--standoff: 330px">
	Signature:<span class="blank" style="min-width: 720px"></span>
</p>
<p class="center standoff" style="--standoff: 70px; font-family: Georgia, serif; font-size: 24px">
	Phone (250) 245-7422
</p>
