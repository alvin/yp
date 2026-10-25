<script lang="ts">
    // The number of guests, changed after booking. The database gives the new
    // number to every room the whole party is in, so the daily reports count
    // it. Rooms held side by side split the party in a way the reservation
    // doesn't record, so each of those keeps a number of its own, set here.
    // Only adults are asked for, as on the booking screen; a child count
    // already on file is left as it is and still shown.
    import { untrack } from "svelte";
    import { toast } from "svelte-sonner";
    import { invalidateAll } from "$app/navigation";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { party, roomWindow } from "$lib/format.js";
    import { setRoomGuests, updateReservation } from "$lib/data/mutations.js";
    import { errorMessage } from "$lib/utils.js";
    import type { OccupancySummary, ReservationSummary } from "$lib/data/types.js";

    let {
        open = $bindable(false),
        s,
        occupancy,
    }: {
        open?: boolean;
        s: ReservationSummary;
        occupancy: OccupancySummary[];
    } = $props();

    let saving = $state(false);
    let adults = $state<number | null>(null);
    let perRoom = $state<Record<number, number | null>>({});

    // Rooms of the stay that share a night with another of its rooms
    // (ypl.reservations_sync_room_guests leaves these alone).
    const sideBySide = $derived(
        occupancy.filter((o) =>
            occupancy.some(
                (x) =>
                    x.occupancyid !== o.occupancyid &&
                    x.occupancyin < o.occupancyout &&
                    o.occupancyin < x.occupancyout,
            ),
        ),
    );
    const isCount = (v: number | null | undefined, min: number) =>
        v != null && Number.isInteger(v) && v >= min;
    // A room left blank keeps the number it has.
    const roomsChanged = $derived(
        sideBySide.filter((o) => {
            const v = perRoom[o.occupancyid];
            return v != null && v !== o.occupancynumguests;
        }),
    );
    const partyChanged = $derived(adults !== s.numadults);
    const valid = $derived(
        isCount(adults, 1) &&
            roomsChanged.every((o) => isCount(perRoom[o.occupancyid], 1)),
    );

    $effect(() => {
        if (open)
            untrack(() => {
                adults = s.numadults;
                perRoom = Object.fromEntries(
                    sideBySide.map((o) => [o.occupancyid, o.occupancynumguests]),
                );
            });
    });

    async function save() {
        const n = adults ?? 0;
        saving = true;
        try {
            if (partyChanged)
                await updateReservation(s.reservationid, { numadults: n });
            for (const o of roomsChanged)
                await setRoomGuests(o.occupancyid, perRoom[o.occupancyid]!);
            open = false;
            toast.success("Guests updated", {
                description: party(n, s.numchildren ?? 0),
            });
            await invalidateAll();
        } catch (e) {
            toast.error(errorMessage(e, "Could not change the number of guests."));
        } finally {
            saving = false;
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>Number of guests on #{s.resnumber}</Dialog.Title>
            <Dialog.Description>
                Adults for this reservation.
            </Dialog.Description>
        </Dialog.Header>
        <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                    <Label for="g-ad">Adults</Label>
                    <Input
                        id="g-ad"
                        type="number"
                        min="1"
                        step="1"
                        bind:value={adults}
                    />
                </div>
            </div>
            {#if sideBySide.length}
                <div class="space-y-1.5" data-testid="guests-per-room">
                    <p class="text-sm font-medium">Guests per room</p>
                    {#each sideBySide as o (o.occupancyid)}
                        <div class="flex items-center justify-between gap-3">
                            <Label
                                for="g-room-{o.occupancyid}"
                                class="text-muted-foreground font-normal"
                                >{roomWindow(o)}</Label
                            >
                            <Input
                                id="g-room-{o.occupancyid}"
                                type="number"
                                min="1"
                                step="1"
                                class="w-20 shrink-0"
                                bind:value={perRoom[o.occupancyid]}
                            />
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
            <Button
                onclick={save}
                disabled={saving ||
                    !valid ||
                    (!partyChanged && !roomsChanged.length)}
            >
                Save guests
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
