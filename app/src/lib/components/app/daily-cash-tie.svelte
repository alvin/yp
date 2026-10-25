<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { money } from '$lib/format.js';

	let {
		total,
		dcar
	}: {
		/** The appendix's own total. */
		total: number;
		/** The Daily Cash figure it ties to. */
		dcar: number;
	} = $props();

	const difference = $derived(Math.abs(total - dcar));
</script>

{#if difference < 0.005}
	<Badge variant="success">Agrees with Daily Cash</Badge>
{:else}
	<Badge variant="warning">Differs by {money(difference)}</Badge>
{/if}
