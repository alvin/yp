<script lang="ts">
    // Rooms: a mid-stay move (the room being left ends on the move date) or
    // an additional room for the same stay.
    import { untrack } from "svelte";
    import { toast } from "svelte-sonner";
    import { invalidateAll } from "$app/navigation";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Combobox } from "$lib/components/ui/combobox/index.js";
    import SegmentedToggle from "$lib/components/app/segmented-toggle.svelte";
    import { addDays, roomWindow } from "$lib/format.js";
    import { ROOMS, roomById, roomName } from "$lib/data/reference.js";
    import { roomOptions } from "$lib/options.js";
    import { assignRoom, recordRoomMove } from "$lib/data/mutations.js";
    import { errorMessage } from "$lib/utils.js";
    import type { OccupancySummary, ReservationSummary } from "$lib/data/types.js";

    let {
        open = $bindable(false),
        s,
        occupancy,
        today,
    }: {
        open?: boolean;
        s: ReservationSummary;
        occupancy: OccupancySummary[];
        today: string;
    } = $props();

    let mode = $state<"move" | "add">("move");
    let from = $state("");
    let room = $state(String(ROOMS[0].roomid));
    let moveDate = $state("");
    let moveOut = $state("");
    let roomIn = $state("");
    let roomOut = $state("");
    let guests = $state(2);
    let notes = $state("");
    const rooms = roomOptions();
    const fromOptions = $derived(
        occupancy.map((o) => ({ value: String(o.occupancyid), label: roomWindow(o) })),
    );

    // A move happens inside the room being left — after its first night and
    // before its last morning — so the date box offers only those dates, and
    // starts on today when today is one of them, otherwise the first. The room
    // that runs to the end of the stay can also be left on the check-out date:
    // a guest who stays on if another room is free. The stay then runs to a new
    // departure, in the new room only.
    const moveDates = $derived.by(() => {
        const o = occupancy.find((x) => String(x.occupancyid) === from);
        if (!o) return null;
        const min = addDays(o.occupancyin, 1);
        const max =
            o.occupancyout === s.resdeparturedate
                ? o.occupancyout
                : addDays(o.occupancyout, -1);
        return min <= max ? { min, max } : null;
    });
    const extending = $derived(
        moveDates?.max === s.resdeparturedate && moveDate === moveDates.max,
    );
    const moveDateOk = $derived(
        !!moveDates &&
            moveDate >= moveDates.min &&
            moveDate <= moveDates.max &&
            (!extending || moveOut > moveDate),
    );
    function firstMoveDate(): string {
        if (!moveDates) return "";
        return today >= moveDates.min && today <= moveDates.max
            ? today
            : moveDates.min;
    }

    $effect(() => {
        if (open)
            untrack(() => {
                mode = occupancy.length ? "move" : "add";
                const current =
                    occupancy.find(
                        (o) => o.occupancyin <= today && o.occupancyout >= today,
                    ) ?? occupancy[occupancy.length - 1];
                from = current ? String(current.occupancyid) : "";
                moveDate = firstMoveDate();
                moveOut = addDays(s.resdeparturedate, 1);
                roomIn = today;
                roomOut = s.resdeparturedate;
                guests = current?.occupancynumguests ?? s.numadults;
                notes = "";
            });
    });

    async function save() {
        const r = roomById(Number(room))!;
        try {
            if (mode === "move") {
                if (!from) {
                    toast.error("Choose the room being left.");
                    return;
                }
                await recordRoomMove(
                    Number(from),
                    r.roomid,
                    moveDate,
                    notes || null,
                    extending ? moveOut : null,
                );
            } else {
                await assignRoom(
                    s.primary_reservationguestid,
                    r.roomid,
                    roomIn,
                    roomOut,
                    guests,
                    notes || null,
                );
            }
            await invalidateAll();
            open = false;
            toast.success(
                `${mode === "move" ? "Room move recorded" : "Room added"} — ${roomName(r)}`,
            );
        } catch (e) {
            toast.error(errorMessage(e, "Could not save the room move."));
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>
                {mode === "move" ? "Move rooms" : "Add a room"}
            </Dialog.Title>
            <Dialog.Description
                >Both rooms stay in the stay history.</Dialog.Description
            >
        </Dialog.Header>
        <div class="space-y-3">
            <SegmentedToggle
                bind:value={mode}
                options={[
                    { value: "move", label: "Move rooms" },
                    { value: "add", label: "Add another room" },
                ]}
            />

            {#if mode === "move"}
                <div class="space-y-1.5">
                    <Label for="m-from">Room being left</Label>
                    <Combobox
                        id="m-from"
                        bind:value={from}
                        options={fromOptions}
                        placeholder="Select room"
                        onchange={() => (moveDate = firstMoveDate())}
                    />
                </div>
            {/if}

            <div class="space-y-1.5">
                <Label for="m-room">{mode === "move" ? "New room" : "Room"}</Label>
                <Combobox
                    id="m-room"
                    bind:value={room}
                    options={rooms}
                    searchPlaceholder="Room name or number…"
                />
            </div>

            {#if mode === "move"}
                <div class="space-y-1.5">
                    <Label for="m-date">Move date</Label>
                    <Input
                        id="m-date"
                        type="date"
                        bind:value={moveDate}
                        min={moveDates?.min}
                        max={moveDates?.max}
                        disabled={!moveDates}
                    />
                    <p class="text-muted-foreground text-xs">
                        The stay switches rooms on this date.
                    </p>
                </div>
                {#if extending}
                    <div class="space-y-1.5">
                        <Label for="m-dep">Departure</Label>
                        <Input
                            id="m-dep"
                            type="date"
                            bind:value={moveOut}
                            min={addDays(moveDate, 1)}
                        />
                    </div>
                {/if}
            {:else}
                <div class="grid grid-cols-3 gap-3">
                    <div class="space-y-1.5">
                        <Label for="m-in">In</Label><Input
                            id="m-in"
                            type="date"
                            bind:value={roomIn}
                        />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="m-out">Out</Label><Input
                            id="m-out"
                            type="date"
                            bind:value={roomOut}
                            min={addDays(roomIn, 1)}
                        />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="m-g">Guests</Label><Input
                            id="m-g"
                            type="number"
                            min="1"
                            bind:value={guests}
                        />
                    </div>
                </div>
            {/if}
            <div class="space-y-1.5">
                <Label for="m-n">Notes</Label><Input
                    id="m-n"
                    bind:value={notes}
                    placeholder="e.g. Moved per guest request"
                />
            </div>
        </div>
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
            <Button
                onclick={save}
                disabled={mode === "move" ? !moveDateOk : roomOut <= roomIn}
            >
                {mode === "move" ? "Record move" : "Add room"}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
