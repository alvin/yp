<script lang="ts">
	// Every telephone field in the app. The number can be typed any way — bare
	// digits, dots, dashes — and is written back in the lodge's format when the
	// clerk leaves the field. A number it does not recognise is left alone.
	import { Input } from '$lib/components/ui/input/index.js';
	import { formatPhone } from '$lib/phone.js';

	let {
		value = $bindable(''),
		id,
		class: className,
		placeholder,
		disabled
	}: {
		value?: string;
		id?: string;
		class?: string;
		placeholder?: string;
		disabled?: boolean;
	} = $props();
</script>

<Input
	{id}
	class={className}
	{placeholder}
	{disabled}
	type="tel"
	inputmode="tel"
	bind:value
	onblur={() => (value = formatPhone(value))}
/>
