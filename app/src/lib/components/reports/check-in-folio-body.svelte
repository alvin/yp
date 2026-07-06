<script lang="ts">
	import type { FolioReport } from '$lib/data/types.js';
	import { dateShort, money } from '$lib/format.js';

	let { r }: { r: FolioReport } = $props();

	// "PORT MOODY, BC CAN" — city, region then country, as on the original folio.
	const cityLine = $derived(
		[[r.guestcity, r.guestregion].filter(Boolean).join(', '), r.guestcountry]
			.filter(Boolean)
			.join(' ')
	);

	const vehicle = $derived(
		[r.vehicle_description, r.vehicle_license_plate].filter(Boolean).join(' ')
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
		<tr>
			<td><b>Room:</b><br />{r.room}</td>
			<td><b>In:</b><br />{dateShort(r.in_date ?? r.arrival_date)}</td>
			<td><b>Out:</b><br />{dateShort(r.out_date ?? r.departure_date)}</td>
			<td><b># Guests</b><br />{r.guest_count}</td>
		</tr>
	</tbody>
</table>
{#if r.deposit_amount != null}
	<table>
		<tbody>
			<tr>
				<td>Deposit (Received){#if r.deposit_type}<br />{r.deposit_type}{/if}</td>
				<td class="money"><b>{money(r.deposit_amount)}</b></td>
			</tr>
		</tbody>
	</table>
{/if}
<p style="margin-top: 120px"><b>Vehicle:</b>{#if vehicle}&nbsp;{vehicle}{/if}</p>
<p style="margin-top: 330px">
	Signature:<span class="blank" style="min-width: 720px"></span>
</p>
<p class="center" style="margin-top: 70px; font-family: Georgia, serif; font-size: 24px">
	Phone (250) 245-7422
</p>
