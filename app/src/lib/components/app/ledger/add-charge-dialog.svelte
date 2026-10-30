<script lang="ts">
    import { untrack } from "svelte";
    import { toast } from "svelte-sonner";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Combobox } from "$lib/components/ui/combobox/index.js";
    import SegmentedToggle from "$lib/components/app/segmented-toggle.svelte";
    import { addDays } from "$lib/format.js";
    import { effectiveRoomRate } from "$lib/data/queries.js";
    import { postCharge, postRoomNights } from "$lib/data/mutations.js";
    import { round2 } from "$lib/charges.js";
    import {
        RATE_TYPES,
        ROOMS,
        inventoryById,
        roomById,
        roomName,
    } from "$lib/data/reference.js";
    import { itemOptions, roomOptions } from "$lib/options.js";
    import { errorMessage } from "$lib/utils.js";
    import type { RoomRateType } from "$lib/data/types.js";

    let {
        open = $bindable(false),
        reservationguestid,
        today,
        onsaved,
    }: {
        open?: boolean;
        /** The stay's guest, whom the charge is posted to. */
        reservationguestid: number;
        today: string;
        /** Refreshes the ledger; the dialog closes once it has. */
        onsaved: () => Promise<void>;
    } = $props();

    let kind = $state<"room" | "item">("room");
    let cRoom = $state(String(ROOMS[0].roomid));
    let cRateType = $state<RoomRateType>("Regular");
    let cItem = $state("");
    let cQty = $state(1);
    let cUnit = $state(0);
    let cDate = $state("");

    $effect(() => {
        if (open)
            untrack(() => {
                kind = "room";
                cRoom = String(ROOMS[0].roomid);
                cRateType = "Regular";
                cItem = "";
                cQty = 1;
                cUnit = 0;
                cDate = today;
            });
    });

    function itemPrice(id: string) {
        cUnit = inventoryById(Number(id))?.invamount ?? 0;
    }

    // A room night is priced from the room's dated rate of the chosen type, as
    // Access asked. Show that rate in Unit price rather than 0.00, so the clerk
    // sees what will post and can still type over it. Picking another room,
    // rate or date looks it up again; a slower earlier lookup never overwrites
    // a newer one.
    //
    // Which of the three rates a stay is charged, if any, is the clerk's
    // choice (RATE_TYPES).
    $effect(() => {
        if (!open || kind !== "room") return;
        const roomid = Number(cRoom);
        const date = cDate;
        const ratetype = cRateType;
        if (!roomid || !date) return;
        let alive = true;
        effectiveRoomRate(roomid, date, ratetype)
            .then((rate) => {
                if (alive) cUnit = rate ?? 0;
            })
            .catch(() => {
                // No rate shown; posting still prices from the room's rate.
            });
        return () => {
            alive = false;
        };
    });

    const rooms = roomOptions();
    const items = itemOptions();

    async function save() {
        const qty = Math.max(1, Number(cQty) || 1);
        const unit = round2(Number(cUnit) || 0);
        if (kind === "item" && !cItem) {
            toast.error("Choose an item to charge.");
            return;
        }
        try {
            let description: string;
            if (kind === "room") {
                const room = roomById(Number(cRoom))!;
                description = roomName(room);
                await postRoomNights(
                    reservationguestid,
                    room.roomid,
                    cDate,
                    addDays(cDate, qty),
                    unit > 0 ? unit : null,
                    cDate,
                    cRateType,
                );
            } else {
                const inv = inventoryById(Number(cItem))!;
                description = inv.invitemdescription ?? inv.invtype;
                await postCharge(
                    reservationguestid,
                    inv.inventoryid,
                    qty,
                    cDate,
                    round2(unit * qty),
                );
            }
            await onsaved();
            open = false;
            toast.success(`Added ${description}`);
        } catch (e) {
            toast.error(errorMessage(e, "Could not add the charge."));
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>Add charge</Dialog.Title>
            <Dialog.Description
                >Room nights and extras.</Dialog.Description
            >
        </Dialog.Header>
        <div class="space-y-3">
            <SegmentedToggle
                bind:value={kind}
                options={[
                    { value: "room", label: "Room night" },
                    { value: "item", label: "Item / extra" },
                ]}
                onchange={(k) => k === "item" && itemPrice(cItem)}
            />

            {#if kind === "room"}
                <div class="space-y-1.5">
                    <Label for="c-room">Room</Label>
                    <Combobox
                        id="c-room"
                        bind:value={cRoom}
                        options={rooms}
                        searchPlaceholder="Room name or number…"
                    />
                </div>
                <div class="space-y-1.5">
                    <Label for="c-rate">Rate</Label>
                    <Combobox
                        id="c-rate"
                        bind:value={cRateType}
                        options={RATE_TYPES}
                    />
                </div>
            {:else}
                <div class="space-y-1.5">
                    <Label for="c-item">Item</Label>
                    <Combobox
                        id="c-item"
                        bind:value={cItem}
                        options={items}
                        placeholder="Choose an item"
                        searchPlaceholder="Item code or name…"
                        onchange={itemPrice}
                    />
                </div>
            {/if}

            <div class="grid grid-cols-3 gap-3">
                <div class="space-y-1.5">
                    <Label for="c-qty"
                        >{kind === "room" ? "Nights" : "Qty"}</Label
                    >
                    <Input id="c-qty" type="number" min="1" bind:value={cQty} />
                </div>
                <div class="space-y-1.5">
                    <Label for="c-unit">Unit price</Label>
                    <Input
                        id="c-unit"
                        type="number"
                        step="0.01"
                        min="0"
                        bind:value={cUnit}
                    />
                </div>
                <div class="space-y-1.5">
                    <Label for="c-date">Date</Label>
                    <Input id="c-date" type="date" bind:value={cDate} />
                </div>
            </div>
        </div>
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (open = false)}
                >Cancel</Button
            >
            <Button onclick={save}>Add charge</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
