<script lang="ts">
	import ReportShell from '$lib/components/app/report-shell.svelte';
	import KitchenBody from '$lib/components/reports/kitchen-body.svelte';
	import { dateShort } from '$lib/format.js';
	import { opsTabs } from '$lib/report-nav.js';

	let { data } = $props();

	/** Screen-only view mode; when true only rows with allergy notes show. */
	let allergyOnly = $state(false);
</script>

<svelte:head><title>Kitchen · {dateShort(data.date)}</title></svelte:head>

<ReportShell
	title="Kitchen/Meal Report — {dateShort(data.date)}"
	orientation="landscape"
	tabs={opsTabs(data.date, 'kitchen')}
	date={data.date}
	backHref="/print"
	backLabel="Print Center"
>
	{#snippet toolbar()}
		<div
			class="flex h-8 items-center rounded-md border bg-background p-0.5 shadow-xs"
			role="group"
			aria-label="Report mode"
		>
			<button
				type="button"
				aria-pressed={!allergyOnly}
				onclick={() => (allergyOnly = false)}
				class="rounded-sm px-2.5 py-1 text-xs font-medium transition-colors {!allergyOnly
					? 'bg-muted text-foreground'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				Full report
			</button>
			<button
				type="button"
				aria-pressed={allergyOnly}
				onclick={() => (allergyOnly = true)}
				class="rounded-sm px-2.5 py-1 text-xs font-medium transition-colors {allergyOnly
					? 'bg-muted text-foreground'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				Allergy only
			</button>
		</div>
	{/snippet}
	<KitchenBody date={data.date} rows={data.rows} totalGuests={data.total_guests} {allergyOnly} />
</ReportShell>
