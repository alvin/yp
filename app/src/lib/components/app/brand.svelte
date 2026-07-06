<script lang="ts">
	import { cn } from '$lib/utils.js';
	let { class: className = '', subtitle = 'Front Desk' }: { class?: string; subtitle?: string } =
		$props();
</script>

<a href="/" class={cn('flex items-center gap-2.5', className)} aria-label="Yellow Point Lodge — Front Desk home">
	<span
		class="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg shadow-sm"
	>
		<svg viewBox="0 0 24 24" fill="none" class="size-5" aria-hidden="true">
			<path d="M3 17.5 9 6l4 7 2-3 6 7.5z" fill="currentColor" opacity="0.95" />
			<path d="M3 20.5h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
		</svg>
	</span>
	<span class="leading-tight">
		<span class="block text-sm font-semibold tracking-tight">Yellow Point Lodge</span>
		<span class="text-muted-foreground block text-[11px] font-medium uppercase tracking-wider"
			>{subtitle}</span
		>
	</span>
</a>
