<script lang="ts">
	// A room as Access's Room form showed it: its details and taxes, and under
	// them its own rate rows, each rate's newest first. A rate line opens the
	// rate in the same drawer, with a way back to the room; Add rate enters a
	// new one. A new room is added first, and the drawer stays on it for its
	// first rates.
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Combobox } from '$lib/components/ui/combobox/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import FormSheet from '$lib/components/app/form-sheet.svelte';
	import RateStatusBadge from '$lib/components/app/rate-status-badge.svelte';
	import TaxChecks from './tax-checks.svelte';
	import RoomRateFields from './room-rate-fields.svelte';
	import RemoveRateDialog from './remove-rate-dialog.svelte';
	import { rateStatus } from '$lib/admin.js';
	import {
		RATE_ORDER,
		endsLine,
		rateLabel,
		rateOn,
		roomLabel,
		runsOnLine,
		type RateForm
	} from '$lib/admin-rooms.js';
	import { TODAY, roomRateHistory } from '$lib/data/queries.js';
	import { removeRoomRate, saveRoom, saveRoomRate } from '$lib/data/mutations.js';
	import { dateShort, money } from '$lib/format.js';
	import { errorMessage } from '$lib/utils.js';
	import type { RateCodeRow, Room, RoomRateRow, RoomRateType, RoomTypeRow } from '$lib/data/types.js';

	let {
		rooms,
		types,
		codes
	}: {
		/** Every room, those disabled included. */
		rooms: Room[];
		types: RoomTypeRow[];
		codes: RateCodeRow[];
	} = $props();

	type Tax = 'gst' | 'pst' | 'room_tax' | 'dmt';
	const TAXES: { key: Tax; label: string }[] = [
		{ key: 'gst', label: 'GST' },
		{ key: 'pst', label: 'PST' },
		{ key: 'room_tax', label: 'Room Tax' },
		{ key: 'dmt', label: 'DMT' }
	];

	let open = $state(false);
	let saving = $state(false);
	let view = $state<'room' | 'rate'>('room');
	let roomid = $state<number | null>(null);
	const room = $derived(roomid == null ? null : (rooms.find((r) => r.roomid === roomid) ?? null));

	// ---- The room ---------------------------------------------------------

	let form = $state(roomForm(null));
	let history = $state<RoomRateRow[]>([]);
	let loaded = $state(false);

	function nextOrder(): number {
		return Math.floor(Math.max(0, ...rooms.map((r) => r.roomorder ?? 0))) + 1;
	}

	function roomForm(r: Room | null) {
		return {
			name: r?.roomname ?? '',
			number: r?.roomnumber ?? '',
			type: r?.roomtype?.trim() ?? '',
			code: r?.roomcode ?? '',
			shorthand: r?.roomshorthand ?? '',
			order: (r?.roomorder ?? nextOrder()) as number | string | null,
			notes: r?.roomnotes ?? '',
			taxes: {
				gst: r?.roomgst ?? false,
				pst: r?.roompst ?? false,
				room_tax: r?.roomrt ?? false,
				dmt: r?.roomdmt ?? false
			} as Record<Tax, boolean | null>
		};
	}

	/** Opens a room, or a new one (null). */
	export async function show(id: number | null) {
		roomid = id;
		view = 'room';
		form = roomForm(id == null ? null : (rooms.find((r) => r.roomid === id) ?? null));
		history = [];
		loaded = id == null;
		open = true;
		if (id != null) {
			history = await roomRateHistory(id);
			loaded = true;
		}
	}

	const shownHistory = $derived(
		[...history].sort(
			(a, b) =>
				RATE_ORDER.indexOf(a.roomratetype) - RATE_ORDER.indexOf(b.roomratetype) ||
				b.from.localeCompare(a.from)
		)
	);

	const canSaveRoom = $derived(
		!!form.name.trim() && !!form.type && form.order !== '' && form.order != null
	);

	async function saveDetails(active = room ? !room.roomarchive : true) {
		saving = true;
		const label = roomLabel({ roomname: form.name.trim(), roomnumber: form.number.trim() || null });
		try {
			const id = await saveRoom({
				roomid,
				roomname: form.name,
				roomnumber: form.number,
				roomtype: form.type,
				roomcode: form.code,
				roomshorthand: form.shorthand,
				roomorder: Number(form.order),
				roomnotes: form.notes,
				gst: form.taxes.gst === true,
				pst: form.taxes.pst === true,
				room_tax: form.taxes.room_tax === true,
				dmt: form.taxes.dmt === true,
				active
			});
			const was = room ? !room.roomarchive : true;
			toast.success(
				!room
					? `Added ${label}`
					: active !== was
						? `${active ? 'Enabled' : 'Disabled'} ${label}`
						: `Saved ${label}`
			);
			await invalidateAll();
			// A new room stays open, for its first rates.
			if (!room) {
				roomid = id;
				loaded = true;
			}
			else open = false;
		} catch (e) {
			toast.error(errorMessage(e, 'Could not save the room.'));
		} finally {
			saving = false;
		}
	}

	// ---- One of its rates -------------------------------------------------

	let rate = $state<RoomRateRow | null>(null);
	let rateForm = $state<RateForm>(blankRate());
	// Filled in from the room's own rates until changed by hand.
	let codeAuto = true;
	let autoTo = '';

	function blankRate(): RateForm {
		return { type: 'Regular', code: '', price: '', from: TODAY, to: '', notes: '' };
	}
	const latestCode = (type: RoomRateType) =>
		history.filter((r) => r.roomratetype === type).sort((a, b) => b.from.localeCompare(a.from))[0]
			?.roomratecode ?? '';
	const runningTo = (type: RoomRateType, day: string) =>
		roomid == null ? '' : (rateOn(history, roomid, type, day)?.to ?? '');

	function addRate() {
		rate = null;
		rateForm = blankRate();
		rateForm.code = latestCode('Regular');
		rateForm.to = autoTo = runningTo('Regular', rateForm.from);
		codeAuto = true;
		view = 'rate';
	}

	function editRate(r: RoomRateRow) {
		rate = r;
		rateForm = {
			type: r.roomratetype,
			code: r.roomratecode,
			price: r.roomrate,
			from: r.from,
			to: r.to,
			notes: r.notes ?? ''
		};
		view = 'rate';
	}

	function onType(type: RoomRateType) {
		if (rate) return;
		if (codeAuto) rateForm.code = latestCode(type);
		if (rateForm.to === autoTo) rateForm.to = autoTo = runningTo(type, rateForm.from);
	}

	const ends = $derived(
		!rate && roomid != null
			? endsLine(history, [roomid], rateForm.type, rateForm.from, rateForm.to)
			: undefined
	);

	const canSaveRate = $derived(
		!!rateForm.code && String(rateForm.price).trim() !== '' && !!rateForm.from && !!rateForm.to
	);

	async function saveRate() {
		if (roomid == null || !room) return;
		saving = true;
		try {
			await saveRoomRate({
				roomrateid: rate?.roomrateid ?? null,
				roomids: [roomid],
				roomratetype: rateForm.type,
				roomratecode: rateForm.code,
				roomrate: Number(rateForm.price),
				from: rateForm.from,
				to: rateForm.to,
				notes: rateForm.notes
			});
			toast.success(
				rate
					? `Saved the ${rateLabel(rateForm.type)} rate for ${roomLabel(room)}`
					: `Added a ${rateLabel(rateForm.type)} rate to ${roomLabel(room)}`
			);
			history = await roomRateHistory(roomid);
			await invalidateAll();
			view = 'room';
		} catch (e) {
			toast.error(errorMessage(e, 'Could not save the rate.'));
		} finally {
			saving = false;
		}
	}

	let removing = $state(false);

	async function remove() {
		if (!rate || roomid == null || !room) return;
		saving = true;
		try {
			await removeRoomRate(rate.roomrateid);
			removing = false;
			toast.success(`Removed the ${rateLabel(rate.roomratetype)} rate for ${roomLabel(room)}`);
			history = await roomRateHistory(roomid);
			await invalidateAll();
			view = 'room';
		} catch (e) {
			toast.error(errorMessage(e, 'Could not remove the rate.'));
		} finally {
			saving = false;
		}
	}
</script>

<FormSheet
	bind:open
	class="sm:max-w-xl"
	back={view === 'rate' ? { label: room ? roomLabel(room) : '', onclick: () => (view = 'room') } : undefined}
	title={view === 'rate'
		? rate
			? `${rateLabel(rate.roomratetype)} rate`
			: 'New rate'
		: room
			? roomLabel(room)
			: 'New room'}
	saveLabel={view === 'rate' ? (rate ? 'Save rate' : 'Add rate') : room ? 'Save room' : 'Add room'}
	{saving}
	canSave={view === 'rate' ? canSaveRate : canSaveRoom}
	onsave={view === 'rate' ? saveRate : () => saveDetails()}
	oncancel={view === 'rate' ? () => (view = 'room') : undefined}
>
	{#if view === 'room'}
		<div class="grid grid-cols-[1fr_7rem] gap-3">
			<div class="space-y-1.5">
				<Label for="room-name">Room name</Label>
				<Input id="room-name" bind:value={form.name} maxlength={25} />
			</div>
			<div class="space-y-1.5">
				<Label for="room-number">Room #</Label>
				<Input id="room-number" bind:value={form.number} maxlength={5} />
			</div>
		</div>
		<div class="grid grid-cols-[1fr_7rem] gap-3">
			<div class="space-y-1.5">
				<Label for="room-type">Room type</Label>
				<Combobox
					id="room-type"
					bind:value={form.type}
					options={types.map((t) => ({ value: t.roomtype, label: t.roomtype }))}
					placeholder="Choose a type"
				/>
			</div>
			<div class="space-y-1.5">
				<Label for="room-order">Sort order</Label>
				<Input id="room-order" type="number" step="any" bind:value={form.order} />
			</div>
		</div>
		<div class="grid grid-cols-[7rem_1fr] gap-3">
			<div class="space-y-1.5">
				<Label for="room-code">Room code</Label>
				<Input id="room-code" bind:value={form.code} maxlength={3} />
			</div>
			<div class="space-y-1.5">
				<Label for="room-shorthand">Room shorthand</Label>
				<Input id="room-shorthand" bind:value={form.shorthand} maxlength={10} />
			</div>
		</div>
		<div class="space-y-1.5">
			<Label for="room-notes">Room notes</Label>
			<Textarea id="room-notes" bind:value={form.notes} rows={2} />
		</div>
		<TaxChecks taxes={TAXES} bind:values={form.taxes} />

		{#if room && loaded}
			<div class="space-y-2 pt-2">
				<div class="flex items-center justify-between">
					<span class="text-sm leading-none font-medium">Rates</span>
					<Button size="sm" variant="outline" onclick={addRate}><PlusIcon /> Add rate</Button>
				</div>
				<div class="overflow-hidden rounded-lg border">
					<Table.Root aria-label="Rates">
						<Table.Header>
							<Table.Row>
								<Table.Head class="pl-3">Rate</Table.Head>
								<Table.Head>Code</Table.Head>
								<Table.Head class="text-right">Price</Table.Head>
								<Table.Head>From</Table.Head>
								<Table.Head>To</Table.Head>
								<Table.Head></Table.Head>
								<Table.Head class="w-6"></Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each shownHistory as r (r.roomrateid)}
								<Table.Row
									class="cursor-pointer {rateStatus(r.from, r.to) === 'past' ? 'text-muted-foreground' : ''}"
									onclick={() => editRate(r)}
								>
									<Table.Cell class="pl-3">{rateLabel(r.roomratetype)}</Table.Cell>
									<Table.Cell class="tabular-nums">{r.roomratecode}</Table.Cell>
									<Table.Cell class="text-right tabular-nums">{money(r.roomrate)}</Table.Cell>
									<Table.Cell class="tabular-nums">{dateShort(r.from)}</Table.Cell>
									<Table.Cell class="tabular-nums">{dateShort(r.to)}</Table.Cell>
									<Table.Cell><RateStatusBadge from={r.from} to={r.to} /></Table.Cell>
									<Table.Cell><ChevronRightIcon class="text-muted-foreground size-4" /></Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={7} class="text-muted-foreground py-6 text-center">No rates.</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		{/if}
	{:else}
		<RoomRateFields
			bind:form={rateForm}
			{codes}
			{ends}
			ontype={onType}
			oncode={() => (codeAuto = false)}
		/>
	{/if}
	{#snippet action()}
		{#if view === 'room' && room}
			<Button
				variant="outline"
				onclick={() => saveDetails(room.roomarchive)}
				disabled={saving || !canSaveRoom}
			>
				{room.roomarchive ? 'Enable room' : 'Disable room'}
			</Button>
		{:else if view === 'rate' && rate && rate.from >= TODAY}
			<Button variant="ghost" class="text-destructive" onclick={() => (removing = true)} disabled={saving}
				>Remove</Button
			>
		{/if}
	{/snippet}
</FormSheet>

{#if rate && room}
	<RemoveRateDialog
		bind:open={removing}
		label="{roomLabel(room)} · {rateLabel(rate.roomratetype)}"
		amount={money(rate.roomrate)}
		detail="{rate.roomratecode} · {dateShort(rate.from)} to {dateShort(rate.to)}"
		runsOn={runsOnLine(history, rate)}
		removing={saving}
		onremove={remove}
	/>
{/if}
