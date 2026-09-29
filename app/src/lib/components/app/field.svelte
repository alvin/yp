<script lang="ts">
	let { label, value = null }: { label: string; value?: string | number | null } = $props();
</script>

<div class="min-w-0">
	<dt class="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">{label}</dt>
	<dd class="mt-0.5 text-sm font-medium break-words">{value ?? '—'}</dd>
</div>
