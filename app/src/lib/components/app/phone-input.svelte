<script lang="ts">
	// Every telephone field in the app. The number can be typed any way — bare
	// digits, dots, dashes — and is written back in the lodge's format when the
	// clerk leaves the field. A number it does not recognise is left alone.
	import { Input } from '$lib/components/ui/input/index.js';
	import { formatPhone } from '$lib/phone.js';

	let {
		value = $bindable(''),
		id
	}: {
		value?: string;
		id?: string;
	} = $props();
</script>

<Input
	{id}
	type="tel"
	inputmode="tel"
	bind:value
	onblur={() => (value = formatPhone(value))}
/>
