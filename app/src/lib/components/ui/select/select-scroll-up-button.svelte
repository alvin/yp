<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: SelectPrimitive.ScrollUpButtonProps = $props();
</script>

<SelectPrimitive.ScrollUpButton
	bind:ref
	data-slot="select-scroll-up-button"
	class={cn('flex cursor-default items-center justify-center py-1', className)}
	{...restProps}
>
	{#if children}
		{@render children?.()}
	{:else}
		<ChevronUpIcon class="size-4" />
	{/if}
</SelectPrimitive.ScrollUpButton>
