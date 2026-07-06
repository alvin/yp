<script lang="ts">
	import { goto } from '$app/navigation';
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import ReportFooter from '$lib/components/app/report-footer.svelte';
	import { dateShort } from '$lib/format.js';
	import { opsTabs } from '$lib/report-nav.js';

	let { data } = $props();

	function changeRange(from: string, to: string) {
		if (!from || !to) return;
		goto(`/reports/kitchen-filtered?from=${from}&to=${to}`);
	}
</script>

<svelte:head
	><title>Kitchen (range) · {dateShort(data.from)}–{dateShort(data.to)}</title></svelte:head
>

<ReportShell
	title="Kitchen Report — {dateShort(data.from)} to {dateShort(data.to)}"
	tabs={opsTabs(data.from, 'kitchen-filtered')}
	backHref="/print"
	backLabel="Print Center"
>
	{#snippet toolbar()}
		<label class="text-muted-foreground text-xs" for="kitchen-from">From</label>
		<input
			id="kitchen-from"
			type="date"
			value={data.from}
			onchange={(e) => changeRange(e.currentTarget.value, data.to)}
			class="h-8 rounded-md border bg-background px-2 text-sm shadow-xs"
		/>
		<label class="text-muted-foreground text-xs" for="kitchen-to">To</label>
		<input
			id="kitchen-to"
			type="date"
			value={data.to}
			onchange={(e) => changeRange(data.from, e.currentTarget.value)}
			class="h-8 rounded-md border bg-background px-2 text-sm shadow-xs"
		/>
	{/snippet}
	<div class="blackbar">Yellow Point Lodge</div>
	<h1>Kitchen Report</h1>
	<h3>Arrival Date between {dateShort(data.from)} and {dateShort(data.to)}</h3>
	<table>
		<thead>
			<tr>
				<th>Res #</th>
				<th>Last Name:</th>
				<th>First Name:</th>
				<th>Guest Diet:</th>
				<th>Kitchen/Meal Notes:</th>
				<th>Arrive:</th>
				<th>Depart</th>
			</tr>
		</thead>
		<tbody>
			{#each data.rows as row, i (row.resnumber + '-' + i)}
				<tr>
					<td>{row.resnumber}</td>
					<td>{row.guestlastname}</td>
					<td>{row.guestfirstname ?? ''}</td>
					<td class="note">{row.guestdiet ?? ''}</td>
					<td class="note">{row.kitchenmealnotes ?? ''}</td>
					<td>{dateShort(row.arrival_date)}</td>
					<td>{dateShort(row.departure_date)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<ReportFooter />
</ReportShell>
