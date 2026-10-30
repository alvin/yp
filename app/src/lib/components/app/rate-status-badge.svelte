<script lang="ts">
	// Where a dated rate stands today: in force, or still to come. A past rate
	// carries no mark; its line is greyed.
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { rateStatus } from '$lib/admin.js';

	let { from, to }: { from: string; to: string } = $props();

	const status = $derived(rateStatus(from, to));
</script>

{#if status === 'current'}
	<Badge variant="success">Current</Badge>
{:else if status === 'upcoming'}
	<Badge variant="outline">Upcoming</Badge>
{/if}
