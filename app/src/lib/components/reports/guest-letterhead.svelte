<script lang="ts">
	// The letterhead every guest document opens with: the party and their
	// mailing address on the left, the document's own dates and numbers on the
	// right.
	import type { Snippet } from 'svelte';

	interface MailingAddress {
		guestaddress: string | null;
		guestcity: string | null;
		guestregion: string | null;
		guestcountry: string | null;
		guestpczip: string | null;
	}

	let { names, to, children }: { names: string; to: MailingAddress; children: Snippet } =
		$props();

	// "PORT MOODY, BC CAN" — city, region then country, as on the originals.
	const cityLine = $derived(
		[[to.guestcity, to.guestregion].filter(Boolean).join(', '), to.guestcountry]
			.filter(Boolean)
			.join(' ')
	);
</script>

<div class="letterhead">
	<div style="text-transform: uppercase">
		{#each names.split('\n') as line (line)}{line}<br />{/each}
		{#if to.guestaddress}{to.guestaddress}<br />{/if}
		{#if cityLine}{cityLine}<br />{/if}
		{#if to.guestpczip}{to.guestpczip}{/if}
	</div>
	<div class="right">
		{@render children()}
	</div>
</div>
