<script lang="ts">
	import type { CheckoutBillHeader, CheckoutBillLine } from '$lib/data/types.js';
	import { dateShort, money } from '$lib/format.js';

	let { h, lines }: { h: CheckoutBillHeader; lines: CheckoutBillLine[] } = $props();

	const charges = $derived(lines.filter((l) => l.sort_group === 'charges'));
	const settlements = $derived(lines.filter((l) => l.sort_group === 'settlements'));

	// "DELTA, BC CAN" — city, region then country, as on the original bill.
	const cityLine = $derived(
		[[h.guestcity, h.guestregion].filter(Boolean).join(', '), h.guestcountry]
			.filter(Boolean)
			.join(' ')
	);
</script>

<div class="logo">Yellow Point Lodge</div>
<div class="letterhead">
	<div style="text-transform: uppercase">
		{#each (h.guest_names ?? h.guest).split('\n') as guest_line (guest_line)}{guest_line}<br />{/each}
		{#if h.guestaddress}{h.guestaddress}<br />{/if}
		{#if cityLine}{cityLine}<br />{/if}
		{#if h.guestpczip}{h.guestpczip}{/if}
	</div>
	<div class="right">
		Date Printed: {dateShort(h.date_printed)}<br /><br />
		{#if h.phone}{h.phone}<br />{/if}
		Res. No. {h.resnumber}
	</div>
</div>
<div class="rule"></div>
<div class="large-line">
	<span>Arrival: {dateShort(h.arrival_date)}</span><span
		>Departure: {dateShort(h.departure_date)}</span
	>
</div>
<table>
	<tbody>
		{#each charges as l (l.sort_order)}
			<tr>
				<td>{l.description}</td>
				<td class="num">{#if l.unit_price != null}{l.quantity} @ {money(l.unit_price)}{/if}</td>
				<td class="money">{money(l.amount)}</td>
			</tr>
		{/each}
	</tbody>
</table>
<table style="width: 45%; margin-left: auto">
	<tbody>
		<tr>
			<td>GST:</td>
			<td class="money">{money(h.tax_gst)}</td>
		</tr>
		<tr>
			<td>PST:</td>
			<td class="money">{money(h.tax_pst)}</td>
		</tr>
		{#if h.tax_hst}
			<tr>
				<td>HST:</td>
				<td class="money">{money(h.tax_hst)}</td>
			</tr>
		{/if}
		<tr>
			<td>Liquor Tax:</td>
			<td class="money">{money(h.tax_liquor)}</td>
		</tr>
		<tr>
			<td>Room Tax:</td>
			<td class="money">{money(h.tax_room)}</td>
		</tr>
		{#if h.tax_hotel}
			<tr>
				<td>Hotel Tax:</td>
				<td class="money">{money(h.tax_hotel)}</td>
			</tr>
		{/if}
		<tr>
			<td>Dest. Mktg Tax:</td>
			<td class="money">{money(h.tax_dmt)}</td>
		</tr>
		<tr class="total">
			<td>Subtotal:</td>
			<td class="money">{money(h.subtotal)}</td>
		</tr>
	</tbody>
</table>
{#if settlements.length}
	<table style="width: 75%">
		<tbody>
			{#each settlements as l (l.sort_order)}
				<tr>
					<td>{l.kind_label}</td>
					<td class="money">{l.display_sign}</td>
					<td class="money">{money(l.amount)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
<p class="right" style="font-size: 30px">
	Balance:&nbsp;&nbsp; {money(h.balance_owing)}
</p>
<p class="right">
	<b>Future Deposit</b><span class="blank"></span><br />
	<b>Gratuity:</b><span class="blank"></span><br />
	<b>Total:</b><span class="blank"></span>
</p>
<p>GST # {h.gst_registration_number}</p>
<p class="center" style="font-size: 26px; margin-top: 60px">Thank you for staying with us.</p>
