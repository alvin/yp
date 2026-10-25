<script lang="ts">
	import DepositsAppendix from '$lib/components/reports/deposits-appendix.svelte';

	let { data } = $props();
</script>

<DepositsAppendix kind="Applied" date={data.date} rows={data.rows} dcarLine={data.dcar_line} />
