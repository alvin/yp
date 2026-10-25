<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let {
		id,
		label = 'Date',
		value,
		onchange = showDate
	}: {
		id: string;
		label?: string;
		value: string;
		/** Called with the picked date; by default the page reloads for it (`?date=`). */
		onchange?: (date: string) => void;
	} = $props();

	function showDate(date: string) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('date', date);
		goto(`${page.url.pathname}?${params}`);
	}
</script>

<label class="text-muted-foreground text-xs" for={id}>{label}</label>
<input
	{id}
	type="date"
	{value}
	onchange={(e) => e.currentTarget.value && onchange(e.currentTarget.value)}
	class="h-8 rounded-md border bg-field px-2 text-sm shadow-xs"
/>
