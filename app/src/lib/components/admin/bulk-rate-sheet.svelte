<script lang="ts">
	// One new rate on several rooms at once, as Access's Append Room Rates put a
	// season's rates on every room. The rooms are chosen here, by name; picking
	// a rate code ticks the rooms charged at it now, and the rate they are at,
	// which can then be changed. Each room's rate of that type running when it
	// starts ends the day before, as for one room.
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Combobox, type ComboboxOption } from '$lib/components/ui/combobox/index.js';
	import FormSheet from '$lib/components/app/form-sheet.svelte';
	import RoomRateFields from './room-rate-fields.svelte';
	import { RATE_ORDER, endsLine, rateLabel, rateOn, roomLabel, type RateForm } from '$lib/admin-rooms.js';
	import { TODAY } from '$lib/data/queries.js';
	import { saveRoomRate } from '$lib/data/mutations.js';
	import { money } from '$lib/format.js';
	import { errorMessage } from '$lib/utils.js';
	import type { RateCodeRow, Room, RoomRateRow, RoomRateType } from '$lib/data/types.js';

	let {
		rooms,
		rates,
		codes
	}: {
		rooms: Room[];
		/** The rooms' rates in force today or still to come. */
		rates: RoomRateRow[];
		codes: RateCodeRow[];
	} = $props();

	let open = $state(false);
	let saving = $state(false);
	let form = $state<RateForm>(blank());
	let roomids = $state<number[]>([]);
	// Filled in from the rate code until changed by hand.
	let roomsAuto = true;
	let typeAuto = true;

	function blank(): RateForm {
		return { type: 'Regular', code: '', price: '', from: TODAY, to: '', notes: '' };
	}

	export function show() {
		form = blank();
		roomids = [];
		roomsAuto = typeAuto = true;
		open = true;
	}

	const active = $derived(rooms.filter((r) => !r.roomarchive));
	const byId = $derived(new Map(rooms.map((r) => [r.roomid, r])));

	// Grouped by room type, in the lodge's order within each.
	const roomOptions = $derived<ComboboxOption[]>(
		[...active]
			.sort(
				(a, b) =>
					(a.roomtype ?? '').trim().localeCompare((b.roomtype ?? '').trim()) ||
					(a.roomorder ?? 0) - (b.roomorder ?? 0)
			)
			.map((r) => {
				const now = rateOn(rates, r.roomid, form.type);
				return {
					value: String(r.roomid),
					label: roomLabel(r),
					hint: now ? money(now.roomrate) : '',
					group: (r.roomtype ?? '').trim()
				};
			})
	);

	function tickRooms(values: string[], on: boolean) {
		roomsAuto = false;
		const ids = values.map(Number);
		roomids = on ? [...roomids, ...ids.filter((id) => !roomids.includes(id))] : roomids.filter((id) => !ids.includes(id));
	}

	// The common end of the chosen rooms' running rates, for the new rate's To.
	function prefillTo() {
		if (form.to || !roomids.length) return;
		const ends = new Set(roomids.map((id) => rateOn(rates, id, form.type, form.from)?.to ?? ''));
		if (ends.size === 1) form.to = [...ends][0];
	}

	function onCode(code: string) {
		const at = rates.filter(
			(r) => r.roomratecode === code && r.to >= TODAY && byId.get(r.roomid) && !byId.get(r.roomid)!.roomarchive
		);
		const atTypes = RATE_ORDER.filter((t) => at.some((r) => r.roomratetype === t));
		if (typeAuto && atTypes.length === 1) form.type = atTypes[0];
		if (roomsAuto || !roomids.length) {
			const ids = new Set(at.filter((r) => r.roomratetype === form.type).map((r) => r.roomid));
			roomids = active.filter((r) => ids.has(r.roomid)).map((r) => r.roomid);
			roomsAuto = true;
		}
		prefillTo();
	}

	function onType(_type: RoomRateType) {
		typeAuto = false;
	}

	const ends = $derived(endsLine(rates, roomids, form.type, form.from, form.to));

	const canSave = $derived(
		roomids.length > 0 && !!form.code && String(form.price).trim() !== '' && !!form.from && !!form.to
	);

	function roomsText(picked: ComboboxOption[]): string {
		if (picked.length === roomOptions.length) return 'All rooms';
		if (picked.length === 1) return picked[0].label;
		return `${picked.length} rooms`;
	}

	async function save() {
		saving = true;
		const whom = roomids.length === 1 ? roomLabel(byId.get(roomids[0])!) : `${roomids.length} rooms`;
		try {
			await saveRoomRate({
				roomrateid: null,
				roomids,
				roomratetype: form.type,
				roomratecode: form.code,
				roomrate: Number(form.price),
				from: form.from,
				to: form.to,
				notes: form.notes
			});
			open = false;
			toast.success(`Added a ${rateLabel(form.type)} rate to ${whom}`);
			await invalidateAll();
		} catch (e) {
			toast.error(errorMessage(e, 'Could not add the rate.'));
		} finally {
			saving = false;
		}
	}
</script>

<FormSheet bind:open class="sm:max-w-xl" title="New rate" saveLabel="Add rate" {saving} {canSave} onsave={save}>
	<RoomRateFields bind:form {codes} {ends} ontype={onType} oncode={onCode}>
		{#snippet roomsField()}
			<div class="space-y-1.5">
				<Label for="rate-rooms">Rooms</Label>
				<Combobox
					id="rate-rooms"
					multiple
					values={roomids.map(String)}
					options={roomOptions}
					placeholder="Choose rooms"
					searchPlaceholder="Room name or number…"
					summary={roomsText}
					ontoggle={tickRooms}
				/>
				{#if roomids.length}
					<p class="text-muted-foreground text-xs" data-testid="rate-rooms-chosen">
						{active
							.filter((r) => roomids.includes(r.roomid))
							.map(roomLabel)
							.join(', ')}
					</p>
				{/if}
			</div>
		{/snippet}
	</RoomRateFields>
</FormSheet>
