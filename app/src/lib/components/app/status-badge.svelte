<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { BadgeVariant } from '$lib/components/ui/badge/index.js';

	let { status, class: className = '' }: { status: string; class?: string } = $props();

	const MAP: Record<string, { label: string; variant: BadgeVariant }> = {
		'Arrive Today': { label: 'Arrive today', variant: 'success' },
		'Depart Today': { label: 'Depart today', variant: 'warning' },
		'Move In': { label: 'Room move', variant: 'default' },
		'In House': { label: 'In house', variant: 'secondary' },
		arrival: { label: 'Arrival', variant: 'success' },
		departure: { label: 'Departure', variant: 'warning' },
		in_house: { label: 'In house', variant: 'secondary' },
		occupancy: { label: 'In house', variant: 'secondary' },
		overlap: { label: 'Overlapping', variant: 'secondary' },
		date_match: { label: 'Match', variant: 'secondary' },
		future: { label: 'Future', variant: 'default' },
		present: { label: 'In house', variant: 'success' },
		past: { label: 'Past', variant: 'secondary' },
		confirmed: { label: 'Confirmed', variant: 'success' },
		cancelled: { label: 'Cancelled', variant: 'destructive' }
	};

	const info = $derived(MAP[status] ?? { label: status, variant: 'secondary' as BadgeVariant });
</script>

<Badge variant={info.variant} class={className}>{info.label}</Badge>
