<script lang="ts">
    // Undo a move booked ahead and no longer needed: the stay keeps the room
    // it was leaving. Where two rooms moved on the same day the database can't
    // tell which one this move replaced, so the desk picks it.
    import { untrack } from "svelte";
    import { toast } from "svelte-sonner";
    import { invalidateAll } from "$app/navigation";
    import TrashIcon from "@lucide/svelte/icons/trash-2";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Combobox } from "$lib/components/ui/combobox/index.js";
    import { dateShort, roomWindow } from "$lib/format.js";
    import { undoRoomMove } from "$lib/data/mutations.js";
    import { errorMessage } from "$lib/utils.js";
    import type { OccupancySummary } from "$lib/data/types.js";

    let {
        open = $bindable(false),
        target,
        occupancy,
        moves,
    }: {
        open?: boolean;
        target: OccupancySummary | null;
        occupancy: OccupancySummary[];
        /** Each move, keyed to the room(s) it moved from. */
        moves: Map<number, number[]>;
    } = $props();

    let from = $state("");
    let saving = $state(false);
    const fromIds = $derived(target ? (moves.get(target.occupancyid) ?? []) : []);
    const fromOptions = $derived(
        fromIds.map((id) => {
            const o = occupancy.find((x) => x.occupancyid === id);
            return { value: String(id), label: o ? roomWindow(o) : String(id) };
        }),
    );
    const keeps = $derived(occupancy.find((o) => String(o.occupancyid) === from));

    $effect(() => {
        if (open)
            untrack(() => {
                from = fromIds.length === 1 ? String(fromIds[0]) : "";
            });
    });

    async function save() {
        const o = target;
        if (!o || !from) return;
        saving = true;
        try {
            await undoRoomMove(o.occupancyid, Number(from));
            await invalidateAll();
            open = false;
            toast.success(`Room move undone — ${o.room_compact}`);
        } catch (e) {
            toast.error(errorMessage(e, "Could not undo the move."));
        } finally {
            saving = false;
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-sm">
        <Dialog.Header>
            <Dialog.Title>Undo this move?</Dialog.Title>
            <Dialog.Description>
                {#if keeps && target}
                    The stay keeps {keeps.room_compact} to {dateShort(
                        target.occupancyout,
                    )}.
                {:else}
                    The stay keeps the room it was leaving.
                {/if}
            </Dialog.Description>
        </Dialog.Header>
        {#if target}
            <div class="bg-muted/40 rounded-lg border px-3 py-2 text-sm">
                <div class="font-medium">{target.room_compact}</div>
                <div class="text-muted-foreground mt-0.5 text-xs">
                    {dateShort(target.occupancyin)} → {dateShort(
                        target.occupancyout,
                    )}
                </div>
            </div>
            {#if fromOptions.length > 1}
                <div class="space-y-1.5">
                    <Label for="u-from">Moving from</Label>
                    <Combobox
                        id="u-from"
                        bind:value={from}
                        options={fromOptions}
                        placeholder="Select room"
                    />
                </div>
            {/if}
        {/if}
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (open = false)}>Keep it</Button>
            <Button variant="destructive" disabled={saving || !from} onclick={save}>
                <TrashIcon /> Undo move
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
