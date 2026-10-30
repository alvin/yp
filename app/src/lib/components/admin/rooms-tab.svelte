<script lang="ts">
	// The rooms, in the lodge's sort order, each with the Double, Single and
	// Split rates it is charged at today. A room opens in the drawer, as on
	// Access's Room form; Add room enters a new one, and Add rate puts one new
	// rate on several rooms at once.
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import RoomSheet from './room-sheet.svelte';
	import BulkRateSheet from './bulk-rate-sheet.svelte';
	import { RATE_ORDER, rateOn, roomLabel } from '$lib/admin-rooms.js';
	import { money } from '$lib/format.js';
	import type { RateCodeRow, Room, RoomRateRow, RoomTypeRow } from '$lib/data/types.js';

	let {
		rooms,
		rates,
		codes,
		types
	}: {
		rooms: Room[];
		rates: RoomRateRow[];
		codes: RateCodeRow[];
		types: RoomTypeRow[];
	} = $props();

	let showDisabled = $state(false);
	const shown = $derived(rooms.filter((r) => showDisabled || !r.roomarchive));

	const taxes = (r: Room) =>
		[r.roomgst && 'GST', r.roompst && 'PST', r.roomrt && 'Room', r.roomdmt && 'DMT']
			.filter(Boolean)
			.join(' · ');

	let roomSheet: ReturnType<typeof RoomSheet> | undefined = $state();
	let bulkSheet: ReturnType<typeof BulkRateSheet> | undefined = $state();
</script>

<div class="mb-3 flex flex-wrap items-center justify-end gap-3">
	<label class="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm">
		<input type="checkbox" class="accent-primary size-4" bind:checked={showDisabled} />
		Show disabled
	</label>
	<Button variant="outline" onclick={() => bulkSheet?.show()}><PlusIcon /> Add rate</Button>
	<Button onclick={() => roomSheet?.show(null)}><PlusIcon /> Add room</Button>
</div>

<div class="bg-card overflow-hidden rounded-xl border">
	<Table.Root aria-label="Rooms">
		<Table.Header>
			<Table.Row>
				<Table.Head class="pl-4">Room</Table.Head>
				<Table.Head>Type</Table.Head>
				<Table.Head>Shorthand</Table.Head>
				<Table.Head class="text-right">Double</Table.Head>
				<Table.Head class="text-right">Single</Table.Head>
				<Table.Head class="text-right">Split</Table.Head>
				<Table.Head>Taxes</Table.Head>
				<Table.Head class="text-right">Sort order</Table.Head>
				<Table.Head></Table.Head>
				<Table.Head class="w-8"></Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each shown as r (r.roomid)}
				<Table.Row
					class="cursor-pointer {r.roomarchive ? 'text-muted-foreground' : ''}"
					onclick={() => roomSheet?.show(r.roomid)}
				>
					<Table.Cell class="pl-4 font-medium">{roomLabel(r)}</Table.Cell>
					<Table.Cell>{r.roomtype?.trim() ?? ''}</Table.Cell>
					<Table.Cell>{r.roomshorthand ?? ''}</Table.Cell>
					{#each RATE_ORDER as type (type)}
						{@const now = rateOn(rates, r.roomid, type)}
						<Table.Cell class="text-right tabular-nums">{now ? money(now.roomrate) : '—'}</Table.Cell>
					{/each}
					<Table.Cell class="text-muted-foreground">{taxes(r)}</Table.Cell>
					<Table.Cell class="text-muted-foreground text-right tabular-nums">{r.roomorder ?? ''}</Table.Cell>
					<Table.Cell>{#if r.roomarchive}<Badge variant="secondary">Disabled</Badge>{/if}</Table.Cell>
					<Table.Cell><ChevronRightIcon class="text-muted-foreground size-4" /></Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>

<RoomSheet bind:this={roomSheet} {rooms} {types} {codes} />
<BulkRateSheet bind:this={bulkSheet} {rooms} {rates} {codes} />
