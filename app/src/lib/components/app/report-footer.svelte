<script lang="ts">
	import { footerTimestamp } from '$lib/format.js';

	let { page = 'Page 1 of 1' }: { page?: string } = $props();
</script>

<div class="footer">
	<span>{footerTimestamp()}</span>
	<span>{page}</span>
</div>
