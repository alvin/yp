<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import HouseIcon from '@lucide/svelte/icons/house';
	import Brand from '$lib/components/app/brand.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { supabase } from '$lib/data/client.js';
	import { cn } from '$lib/utils.js';

	let { children } = $props();

	const SECTIONS = [
		{ href: '/admin/sales', label: 'Sales Reports' },
		{ href: '/admin/item-prices', label: 'Item Prices' },
		{ href: '/admin/rooms', label: 'Rooms & Rates' },
		{ href: '/admin/taxes', label: 'Taxes' },
		{ href: '/admin/year-end-deposits', label: 'Year End Deposits' }
	];

	async function signOut() {
		await supabase.auth.signOut();
		await goto('/login');
	}
</script>

<header class="border-b bg-card print:hidden">
	<div class="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
		<div class="flex items-center gap-6">
			<Brand href="/admin" area="Admin" />
			<nav class="flex items-center gap-1" aria-label="Admin">
				{#each SECTIONS as s (s.href)}
					{@const current = page.url.pathname.startsWith(s.href)}
					<a
						href={s.href}
						aria-current={current ? 'page' : undefined}
						class={cn(
							'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
							current
								? 'bg-secondary text-foreground'
								: 'text-muted-foreground hover:text-foreground'
						)}>{s.label}</a
					>
				{/each}
			</nav>
		</div>
		<div class="flex items-center gap-1.5">
			<Button variant="ghost" size="sm" href="/">
				<HouseIcon />
				<span class="hidden sm:inline">Front desk</span>
			</Button>
			<Button variant="ghost" size="sm" title="Sign out" onclick={signOut}>
				<LogOutIcon />
			</Button>
		</div>
	</div>
</header>

{@render children()}
