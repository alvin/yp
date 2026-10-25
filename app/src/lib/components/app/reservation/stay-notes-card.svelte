<script lang="ts">
    // The notes on a stay that print. Each tab edits one note, and what's in
    // the box is what prints: the guest's diet (as the kitchen reads it), the
    // housekeeping note in force, the guest's requests, and each room's
    // occupancy notes.
    import { untrack } from "svelte";
    import { toast } from "svelte-sonner";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import { roomWindow } from "$lib/format.js";
    import { dietText } from "$lib/data/queries.js";
    import {
        saveKitchenMeal,
        setHousekeepingNote,
        setOccupancyNotes,
        updateReservationGuestNotes,
    } from "$lib/data/mutations.js";
    import { errorMessage } from "$lib/utils.js";
    import type {
        KitchenMeal,
        OccupancySummary,
        ReservationSummary,
    } from "$lib/data/types.js";

    let {
        s,
        kitchenMeal,
        housekeepingNote,
        requests,
        occupancy,
        today,
    }: {
        s: ReservationSummary;
        kitchenMeal: KitchenMeal | undefined;
        housekeepingNote: string;
        requests: string | null;
        occupancy: OccupancySummary[];
        today: string;
    } = $props();

    // Seeded once: a save elsewhere on the page reloads the data but leaves
    // what's being typed here alone.
    let kitchenMealId = $state(untrack(() => kitchenMeal?.kitchenmealid ?? null));
    let kitchenText = $state(untrack(() => dietText(kitchenMeal)));
    let housekeepingText = $state(untrack(() => housekeepingNote));
    let requestText = $state(untrack(() => requests ?? ""));

    // Occupancy notes follow the rooms: a room added or moved into, or a
    // cancellation note added to the first room, shows up here. A room whose
    // saved note hasn't changed keeps what's being typed.
    let occupancyText = $state<Record<number, string>>({});
    const savedOccupancy: Record<number, string> = {};
    $effect(() => {
        for (const o of occupancy) {
            const saved = o.occupancynotes ?? "";
            if (savedOccupancy[o.occupancyid] !== saved) {
                savedOccupancy[o.occupancyid] = saved;
                occupancyText[o.occupancyid] = saved;
            }
        }
    });

    async function save(which: string, write: () => Promise<unknown>) {
        try {
            await write();
            toast.success(`${which} notes saved`);
        } catch (e) {
            toast.error(errorMessage(e, `Could not save ${which} notes.`));
        }
    }

    const saveKitchen = () =>
        save("Kitchen", async () => {
            // A diet on file is saved even when emptied, which clears it;
            // with none on file, an empty tab adds nothing. A record the
            // tab writes is the one its next save revises, not a second.
            if (kitchenMealId || kitchenText.trim())
                kitchenMealId = await saveKitchenMeal(
                    s.primary_guestid,
                    kitchenText,
                    kitchenMealId,
                );
        });
    const saveHousekeeping = () =>
        save("Housekeeping", () =>
            setHousekeepingNote(s.primary_reservationguestid, housekeepingText, today),
        );
    const saveRequests = () =>
        save("Request", () =>
            updateReservationGuestNotes(s.primary_reservationguestid, requestText),
        );
    const saveOccupancy = () =>
        save("Occupancy", async () => {
            for (const o of occupancy) {
                const text = occupancyText[o.occupancyid] ?? "";
                if (text !== savedOccupancy[o.occupancyid]) {
                    await setOccupancyNotes(o.occupancyid, text);
                    savedOccupancy[o.occupancyid] = text;
                }
            }
        });
</script>

<Card.Root>
    <Card.Header class="border-b pb-4">
        <Card.Title class="text-base">Notes for reports</Card.Title>
        <Card.Description
            >Notes that print on the daily reports and guest documents.</Card.Description
        >
    </Card.Header>
    <Card.Content>
        <Tabs.Root value="kitchen">
            <Tabs.List class="grid w-full grid-cols-4">
                <Tabs.Trigger value="kitchen">Kitchen</Tabs.Trigger>
                <Tabs.Trigger value="hk">Housekeeping</Tabs.Trigger>
                <Tabs.Trigger value="req">Requests</Tabs.Trigger>
                <Tabs.Trigger value="occ">Occupancy</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="kitchen" class="mt-3 space-y-2">
                <Textarea
                    bind:value={kitchenText}
                    rows={4}
                    placeholder="Allergies, meal preferences"
                />
                <p class="text-muted-foreground text-xs">
                    Prints on the kitchen report, confirmation and check-in folio.
                </p>
                <Button size="sm" variant="secondary" onclick={saveKitchen}>Save</Button>
            </Tabs.Content>
            <Tabs.Content value="hk" class="mt-3 space-y-2">
                <Textarea
                    bind:value={housekeepingText}
                    rows={4}
                    placeholder="Bed setup, room readiness"
                />
                <p class="text-muted-foreground text-xs">
                    Prints on the housekeeping report, confirmation and check-in folio.
                </p>
                <Button size="sm" variant="secondary" onclick={saveHousekeeping}
                    >Save</Button
                >
            </Tabs.Content>
            <Tabs.Content value="req" class="mt-3 space-y-2">
                <Textarea
                    bind:value={requestText}
                    rows={4}
                    placeholder="In-house requests"
                />
                <p class="text-muted-foreground text-xs">
                    Prints on the in-house and requests reports and the confirmation.
                </p>
                <Button size="sm" variant="secondary" onclick={saveRequests}>Save</Button>
            </Tabs.Content>
            <Tabs.Content value="occ" class="mt-3 space-y-2">
                {#each occupancy as o (o.occupancyid)}
                    {#if occupancy.length > 1}
                        <Label
                            for="occ-{o.occupancyid}"
                            class="text-muted-foreground text-xs font-normal"
                            >{roomWindow(o)}</Label
                        >
                    {/if}
                    <Textarea
                        id="occ-{o.occupancyid}"
                        bind:value={occupancyText[o.occupancyid]}
                        rows={occupancy.length > 1 ? 2 : 4}
                        placeholder="Messages for the guest, who's joining"
                    />
                {/each}
                <p class="text-muted-foreground text-xs">
                    Prints on the in-house report, confirmation and cancellation notice.
                </p>
                <Button size="sm" variant="secondary" onclick={saveOccupancy}
                    >Save</Button
                >
            </Tabs.Content>
        </Tabs.Root>
    </Card.Content>
</Card.Root>
