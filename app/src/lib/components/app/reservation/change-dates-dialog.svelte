<script lang="ts">
    // Change dates: the same stay, extended or shortened. The database moves
    // the reservation guests and their room assignments with it and recomputes
    // the night count; charges already posted stay as posted.
    import { untrack } from "svelte";
    import { toast } from "svelte-sonner";
    import { invalidateAll } from "$app/navigation";
    import CalendarIcon from "@lucide/svelte/icons/calendar";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { bookingHorizon, dateMed, nightsBetween, stayNights } from "$lib/format.js";
    import { updateReservation } from "$lib/data/mutations.js";
    import { errorMessage } from "$lib/utils.js";
    import type { ReservationSummary } from "$lib/data/types.js";

    let {
        open = $bindable(false),
        s,
        today,
    }: { open?: boolean; s: ReservationSummary; today: string } = $props();

    let arrival = $state("");
    let departure = $state("");
    let saving = $state(false);

    $effect(() => {
        if (open)
            untrack(() => {
                arrival = s.resarrivaldate;
                departure = s.resdeparturedate;
            });
    });

    const nights = $derived(
        arrival && departure && departure > arrival
            ? nightsBetween(arrival, departure)
            : 0,
    );
    const changed = $derived(
        arrival !== s.resarrivaldate || departure !== s.resdeparturedate,
    );

    async function save() {
        if (!arrival || !departure || departure <= arrival) {
            toast.error("Departure must be after arrival.");
            return;
        }
        saving = true;
        try {
            await updateReservation(s.reservationid, { arrival, departure });
            open = false;
            toast.success(`Stay dates updated`, {
                description: `${dateMed(arrival)} → ${dateMed(departure)} · ${nights} night${nights === 1 ? "" : "s"}`,
            });
            await invalidateAll();
        } catch (e) {
            toast.error(errorMessage(e, "Could not change the dates."));
        } finally {
            saving = false;
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>Change the dates of #{s.resnumber}</Dialog.Title>
            <Dialog.Description>
                New stay dates for this reservation.
            </Dialog.Description>
        </Dialog.Header>
        <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                    <Label for="d-arr">Arrival</Label>
                    <Input
                        id="d-arr"
                        type="date"
                        bind:value={arrival}
                        max={bookingHorizon(today)}
                    />
                </div>
                <div class="space-y-1.5">
                    <Label for="d-dep">Departure</Label>
                    <Input
                        id="d-dep"
                        type="date"
                        bind:value={departure}
                        min={arrival}
                        aria-invalid={!!arrival &&
                            !!departure &&
                            departure <= arrival}
                    />
                </div>
            </div>
            {#if nights > 0 && changed}
                <p class="text-muted-foreground text-xs">
                    {nights} night{nights === 1 ? "" : "s"} — was {stayNights(s)}.
                </p>
            {/if}
        </div>
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
            <Button onclick={save} disabled={saving || !changed || nights <= 0}>
                <CalendarIcon /> Save dates
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
