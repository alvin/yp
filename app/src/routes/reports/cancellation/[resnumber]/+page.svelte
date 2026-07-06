<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import { dateShort, money } from '$lib/format.js';
	import { guestDocTabs } from '$lib/report-nav.js';

	let { data } = $props();
	const r = $derived(data.report);

	// "VICTORIA, BC CAN" — city, region then country, as on the original notice.
	const cityLine = $derived(
		[[r.guestcity, r.guestregion].filter(Boolean).join(', '), r.guestcountry]
			.filter(Boolean)
			.join(' ')
	);
</script>

<svelte:head><title>Cancellation · #{r.resnumber}</title></svelte:head>

<ReportShell
	title="Cancellation Notice #{r.resnumber}"
	tabs={guestDocTabs(r.resnumber, 'cancellation')}
	backHref="/reservations/{r.resnumber}"
	backLabel="Reservation"
>
	<div class="logo">Yellow Point Lodge</div>
	<h1 style="letter-spacing: 0.45em">CANCELLATION</h1>
	<div class="letterhead">
		<div style="text-transform: uppercase">
			{r.guest}<br />
			{#if r.guestaddress}{r.guestaddress}<br />{/if}
			{#if cityLine}{cityLine}<br />{/if}
			{#if r.guestpczip}{r.guestpczip}{/if}
		</div>
		<div class="right">
			Date Printed: {dateShort(r.date_printed)}<br />
			Date Cancelled: {dateShort(r.date_cancelled)}<br />
			{#if r.phone}{r.phone}<br />{/if}
			Res. No. {r.resnumber}
		</div>
	</div>
	<p class="center" style="margin-top: 55px">
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
	<p class="center" style="margin-top: 120px">
		Our office is open from 8:00 AM to 10:30 PM every day for your calls.<br />We hope we will be
		able to welcome you again soon.
	</p>
	<p class="center" style="margin-top: 250px; font-family: Georgia, serif; font-size: 24px">
		Phone (250) 245-7422
	</p>
</ReportShell>
