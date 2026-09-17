<script lang="ts">
	// The lodge puts two parties in one room on purpose as often as by mistake,
	// so this reports the fact and does not prevent it.
	import UsersIcon from '@lucide/svelte/icons/users';
	import { Badge } from '$lib/components/ui/badge/index.js';

	let { title }: { title?: string } = $props();
</script>

<Badge variant="destructive" class="text-[10px]" {title}>
	<UsersIcon class="size-3" /> Shared
</Badge>
