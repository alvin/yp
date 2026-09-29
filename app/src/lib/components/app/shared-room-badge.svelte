<script lang="ts">
	// The lodge puts two parties in one room on purpose as often as by mistake,
	// so this reports the fact and does not prevent it.
	import UsersIcon from '@lucide/svelte/icons/users';
	import { Badge } from '$lib/components/ui/badge/index.js';
</script>

<Badge variant="destructive" class="text-[10px]">
	<UsersIcon class="size-3" /> Shared
</Badge>
