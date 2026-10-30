<script lang="ts">
	let { children } = $props();
</script>

<main class="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
	{@render children()}
</main>
