<script lang="ts">
    import { toast } from "svelte-sonner";
    import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
    import NotebookIcon from "@lucide/svelte/icons/notebook-pen";
    import ListIcon from "@lucide/svelte/icons/list";
    import UserIcon from "@lucide/svelte/icons/user";
    import CarIcon from "@lucide/svelte/icons/car";
    import BedIcon from "@lucide/svelte/icons/bed-double";
    import PlusIcon from "@lucide/svelte/icons/plus";
    import RepeatIcon from "@lucide/svelte/icons/repeat-2";
    import CheckIcon from "@lucide/svelte/icons/check";
    import XCircleIcon from "@lucide/svelte/icons/circle-x";
    import FileTextIcon from "@lucide/svelte/icons/file-text";
    import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
    import CalendarIcon from "@lucide/svelte/icons/calendar";
    import TrashIcon from "@lucide/svelte/icons/trash-2";
    import PencilIcon from "@lucide/svelte/icons/pencil";
    import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
    import BanknoteIcon from "@lucide/svelte/icons/banknote";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import Field from "$lib/components/app/field.svelte";
    import RowAction from "$lib/components/app/row-action.svelte";
    import StatusBadge from "$lib/components/app/status-badge.svelte";
    import ReservationLedger from "$lib/components/app/reservation-ledger.svelte";
    import SharedRoomBadge from "$lib/components/app/shared-room-badge.svelte";
    import CancelDialog from "$lib/components/app/cancel-dialog.svelte";
    import SettleDepositDialog from "$lib/components/app/settle-deposit-dialog.svelte";
    import NotesDialog, {
        GUEST_NOTES_PLACEHOLDER,
    } from "$lib/components/app/notes-dialog.svelte";
    import ChangeDatesDialog from "$lib/components/app/reservation/change-dates-dialog.svelte";
    import PartySizeDialog from "$lib/components/app/reservation/party-size-dialog.svelte";
    import RoomMoveDialog from "$lib/components/app/reservation/room-move-dialog.svelte";
    import ChangeRoomDialog from "$lib/components/app/reservation/change-room-dialog.svelte";
    import UndoMoveDialog from "$lib/components/app/reservation/undo-move-dialog.svelte";
    import StayNotesCard from "$lib/components/app/reservation/stay-notes-card.svelte";
    import { guestDocTabs } from "$lib/report-nav.js";
    import { afterNavigate, invalidateAll } from "$app/navigation";
    import { dateMed, dateShort, money, party, stayNights } from "$lib/format.js";
    import { bedTypeLabel } from "$lib/data/reference.js";
    import {
        cancelReservation,
        confirmReservation,
        setGuestNotes,
        setReservationNotes,
        settleDeposit,
        uncancelReservation,
    } from "$lib/data/mutations.js";
    import { errorMessage } from "$lib/utils.js";
    import type { OccupancySummary, SharedRoom } from "$lib/data/types.js";

    let { data } = $props();
    const s = $derived(data.summary);
    const today = $derived(data.today);
    const cancelled = $derived(s.rescancelled);
    const occupancy = $derived(data.occupancy);
    // Which rooms are moves, each keyed to the room(s) it moved from.
    const moves = $derived(data.moves);

    // Opened from a list of reservations — a guest's, a date search, an
    // all-fields search — the back button returns to that list, so checking
    // several stays doesn't mean searching again. Opened any other way it goes
    // to Lookup, as before.
    let backToList = $state(false);
    afterNavigate(({ from }) => {
        backToList = /^\/(guests\/|date$|query$)/.test(from?.url.pathname ?? "");
    });

    const statusToday = $derived.by(() => {
        if (cancelled) return "cancelled";
        if (s.resarrivaldate === today) return "Arrive Today";
        if (s.resdeparturedate === today) return "Depart Today";
        if (today > s.resarrivaldate && today < s.resdeparturedate)
            return "In House";
        return s.resarrivaldate > today ? "future" : "past";
    });

    const deposit = $derived(s.deposit_held || null);

    // Rooms this stay holds at the same time as another reservation. The lodge
    // does this deliberately as well as by accident, so it is shown, not barred.
    const sharedByOccupancy = $derived.by(() => {
        const byId = new Map<number, SharedRoom[]>();
        for (const sh of data.shared) {
            const list = byId.get(sh.occupancyid);
            if (list) list.push(sh);
            else byId.set(sh.occupancyid, [sh]);
        }
        return byId;
    });

    // Office-only notes, the guest's and the reservation's.
    let guestNotesOpen = $state(false);
    let reservationNotesOpen = $state(false);

    let datesOpen = $state(false);
    let guestsOpen = $state(false);
    let moveOpen = $state(false);
    let changeOpen = $state(false);
    let changeTarget = $state<OccupancySummary | null>(null);
    let undoOpen = $state(false);
    let undoTarget = $state<OccupancySummary | null>(null);

    // Confirm
    let confirming = $state(false);
    async function markConfirmed() {
        confirming = true;
        try {
            await confirmReservation(s.reservationid);
            toast.success(`Reservation #${s.resnumber} confirmed`);
            await invalidateAll();
        } catch (e) {
            toast.error(errorMessage(e, "Could not confirm."));
        } finally {
            confirming = false;
        }
    }

    // Cancel. A cancellation note goes on the notice, with the first room's
    // occupancy notes (ypl.cancel_reservation).
    let cancelOpen = $state(false);
    async function onCancelled(r: {
        date: string;
        outcome: string;
        notes: string;
    }) {
        const handling = r.outcome.includes("Refund")
            ? "refund"
            : r.outcome.includes("Kept")
              ? "keep"
              : "none";
        try {
            await cancelReservation(
                s.reservationid,
                r.date,
                handling,
                r.notes || null,
            );
            toast.success(`Reservation #${s.resnumber} cancelled`, {
                description: r.outcome !== "none" ? r.outcome : undefined,
            });
            await invalidateAll();
        } catch (e) {
            toast.error(errorMessage(e, "Could not cancel the reservation."));
        }
    }

    // Un-cancel: the booking stands again as it was — same number, dates and
    // rooms. A deposit refunded or kept on cancelling stays as recorded.
    let uncancelling = $state(false);
    async function doUncancel() {
        uncancelling = true;
        try {
            await uncancelReservation(s.reservationid);
            toast.success(`Reservation #${s.resnumber} un-cancelled`);
            await invalidateAll();
        } catch (e) {
            toast.error(errorMessage(e, "Could not un-cancel the reservation."));
        } finally {
            uncancelling = false;
        }
    }

    // A deposit left to decide later on cancelling is refunded or kept here.
    let settleOpen = $state(false);
    async function onSettled(r: { date: string; outcome: string }) {
        const amount = deposit ?? 0;
        try {
            await settleDeposit(
                s.reservationid,
                r.date,
                r.outcome.includes("Refund") ? "refund" : "keep",
            );
            toast.success(`Recorded ${r.outcome} — ${money(amount)}`);
            await invalidateAll();
        } catch (e) {
            toast.error(errorMessage(e, "Could not settle the deposit."));
        }
    }

    const docs = $derived(guestDocTabs(s.resnumber, "", cancelled));
</script>

<svelte:head
    ><title>Reservation #{s.resnumber} · {s.guest_name}</title></svelte:head
>

<!-- Action bar -->
<div class="mb-5 flex flex-wrap items-center gap-3">
    {#if backToList}
        <Button variant="ghost" size="sm" onclick={() => history.back()}
            ><ArrowLeftIcon /> Back</Button
        >
    {:else}
        <Button variant="ghost" size="sm" href="/"><ArrowLeftIcon /> Lookup</Button>
    {/if}
    <div class="flex items-center gap-2">
        <h1 class="text-lg font-semibold">Reservation #{s.resnumber}</h1>
        <StatusBadge status={statusToday} />
        {#if s.resconfirmed && !cancelled}<Badge variant="outline"
                >Confirmed</Badge
            >{/if}
    </div>
    <div class="ml-auto flex flex-wrap items-center gap-2">
        {#if !s.resconfirmed && !cancelled}
            <Button
                variant="outline"
                size="sm"
                disabled={confirming}
                onclick={markConfirmed}
            >
                <CheckIcon /> Mark confirmed
            </Button>
        {/if}
        {#if !cancelled}
            <Button variant="outline" size="sm" onclick={() => (datesOpen = true)}>
                <CalendarIcon /> Change dates
            </Button>
        {/if}
        <!-- Next season's stay, not a change to this one: a new reservation
             carrying this party, room and dates forward. This one stands. -->
        <Button
            variant="outline"
            size="sm"
            href="/reservations/new?from={s.resnumber}"
        >
            <RepeatIcon /> Re-book
        </Button>
        {#if !cancelled}
            <Button
                variant="outline"
                size="sm"
                class="text-destructive"
                onclick={() => (cancelOpen = true)}
            >
                <XCircleIcon /> Cancel
            </Button>
        {:else}
            {#if deposit}
                <Button
                    variant="outline"
                    size="sm"
                    onclick={() => (settleOpen = true)}
                >
                    <BanknoteIcon /> Settle deposit
                </Button>
            {/if}
            <Button
                variant="outline"
                size="sm"
                disabled={uncancelling}
                onclick={doUncancel}
            >
                <RotateCcwIcon /> Un-cancel
            </Button>
        {/if}
    </div>
</div>

<div class="grid items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
    <!-- Left: guest, reservation, rooms, notes -->
    <div class="space-y-5">
        <!-- Guest -->
        <Card.Root>
            <Card.Header class="border-b pb-4">
                <div class="flex items-center justify-between">
                    <Card.Title class="flex items-center gap-2 text-base"
                        ><UserIcon class="size-4" /> Guest</Card.Title
                    >
                    <div class="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            href="/reports/guest-requests/{s.primary_guestid}?from={s.resnumber}"
                        >
                            <ListIcon /> Requests
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onclick={() => (guestNotesOpen = true)}
                        >
                            <NotebookIcon /> Guest notes
                            {#if data.guestNotes}<span
                                    class="bg-primary ml-1 size-1.5 rounded-full"
                                ></span>{/if}
                        </Button>
                    </div>
                </div>
            </Card.Header>
            {#if data.reservationGuest}
                {@const g = data.reservationGuest}
                <Card.Content class="p-0">
                    <div class="px-6 py-3">
                        <a
                            href="/guests/{g.guestid}"
                            class="font-medium hover:underline"
                            >{g.guest_name}</a
                        >
                        {#if g.vehicledescription}
                            <div
                                class="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs"
                            >
                                <CarIcon class="size-3" />
                                {g.vehicledescription}{#if g.vehiclelicenseplate}
                                    · {g.vehiclelicenseplate}{/if}
                            </div>
                        {/if}
                    </div>
                </Card.Content>
            {/if}
        </Card.Root>

        <!-- Reservation details -->
        <Card.Root>
            <Card.Header class="border-b pb-4">
                <div class="flex items-center justify-between">
                    <Card.Title class="text-base">Reservation details</Card.Title>
                    <Button
                        variant="secondary"
                        size="sm"
                        onclick={() => (reservationNotesOpen = true)}
                    >
                        <NotebookIcon /> Reservation notes
                        {#if s.resnotes}<span
                                class="bg-primary ml-1 size-1.5 rounded-full"
                            ></span>{/if}
                    </Button>
                </div>
            </Card.Header>
            <Card.Content>
                <dl class="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Field label="Arrival" value={dateMed(s.resarrivaldate)} />
                    <Field
                        label="Departure"
                        value={dateMed(s.resdeparturedate)}
                    />
                    <Field
                        label="Nights"
                        value={stayNights(s)}
                    />
                    <Field
                        label="Guests"
                        value={party(s.numadults, s.numchildren ?? 0)}
                        onedit={cancelled ? undefined : () => (guestsOpen = true)}
                    />
                    <Field label="Beds" value={bedTypeLabel(s.bedtype)} />
                    <Field label="Arrival time" value={s.resarrivaltime} />
                    <Field label="Booked by" value={s.resbookedby} />
                    <Field
                        label="Confirmed"
                        value={s.resdateconfirmed
                            ? dateMed(s.resdateconfirmed)
                            : "Not confirmed"}
                    />
                    {#if s.resgroupname}<Field
                            label="Group"
                            value={s.resgroupname}
                        />{/if}
                </dl>
            </Card.Content>
        </Card.Root>

        <!-- Rooms / moves -->
        <Card.Root>
            <Card.Header class="border-b pb-4">
                <div class="flex items-center justify-between">
                    <Card.Title class="flex items-center gap-2 text-base"
                        ><BedIcon class="size-4" /> Rooms & moves</Card.Title
                    >
                    <Button variant="outline" size="sm" onclick={() => (moveOpen = true)}
                        ><PlusIcon /> Room move</Button
                    >
                </div>
            </Card.Header>
            <Card.Content class="space-y-2">
                {#each occupancy as o (o.occupancyid)}
                    <div
                        class="group bg-muted/40 flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                    >
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="font-medium">{o.room_compact}</span
                                >
                                {#if o.roomshorthand}<span
                                        class="text-muted-foreground text-xs"
                                        >{o.roomshorthand}</span
                                    >{/if}
                                <StatusBadge status={o.status_today} />
                                {#if sharedByOccupancy.get(o.occupancyid)}
                                    <SharedRoomBadge />
                                {/if}
                            </div>
                            <div class="text-muted-foreground mt-0.5 text-xs">
                                {dateShort(o.occupancyin)} → {dateShort(
                                    o.occupancyout,
                                )} · {o.occupancynumguests} guest{o.occupancynumguests ===
                                1
                                    ? ""
                                    : "s"}
                                {#if o.occupancynotes}· {o.occupancynotes}{/if}
                            </div>
                            {#each sharedByOccupancy.get(o.occupancyid) ?? [] as sh (sh.other_reservationid)}
                                <div
                                    data-testid="shared-room"
                                    class="text-destructive mt-0.5 text-xs"
                                >
                                    <a
                                        class="hover:underline"
                                        href="/reservations/{sh.other_resnumber}"
                                        >#{sh.other_resnumber}
                                        {sh.other_guest}</a
                                    >
                                    · {dateShort(sh.shared_in)} → {dateShort(
                                        sh.shared_out,
                                    )}
                                </div>
                            {/each}
                        </div>
                        <RowAction
                            icon={PencilIcon}
                            label="Change room {o.room_compact}"
                            title="Change room"
                            class="ml-auto shrink-0"
                            onclick={() => {
                                changeTarget = o;
                                changeOpen = true;
                            }}
                        />
                        {#if moves.has(o.occupancyid)}
                            <RowAction
                                icon={TrashIcon}
                                label="Undo move to {o.room_compact}"
                                title="Undo this move"
                                class="shrink-0"
                                destructive
                                onclick={() => {
                                    undoTarget = o;
                                    undoOpen = true;
                                }}
                            />
                        {/if}
                    </div>
                {/each}
            </Card.Content>
        </Card.Root>

        <StayNotesCard
            {s}
            kitchenMeal={data.kitchenMeal}
            housekeepingNote={data.housekeepingNote}
            requests={data.reservationGuest?.rgnotes ?? null}
            {occupancy}
            {today}
        />
    </div>

    <!-- Right: ledger + print -->
    <div class="space-y-5 lg:sticky lg:top-20">
        <ReservationLedger
            reservationid={s.reservationid}
            reservationguestid={s.primary_reservationguestid}
            initialLines={data.ledger}
            {today}
        />

        <Card.Root>
            <Card.Header class="border-b pb-4">
                <Card.Title class="flex items-center gap-2 text-base"
                    ><FileTextIcon class="size-4" /> Print</Card.Title
                >
            </Card.Header>
            <Card.Content class="grid grid-cols-2 gap-2">
                {#each docs as d (d.href)}
                    <Button
                        variant="outline"
                        size="sm"
                        href={d.href}
                        class="justify-between"
                    >
                        {d.label}
                        <ArrowRightIcon class="size-3.5" />
                    </Button>
                {/each}
            </Card.Content>
        </Card.Root>
    </div>
</div>

<NotesDialog
    bind:open={guestNotesOpen}
    title="Guest notes"
    notes={data.guestNotes}
    placeholder={GUEST_NOTES_PLACEHOLDER}
    save={(text) => setGuestNotes(s.primary_guestid, text)}
/>
<NotesDialog
    bind:open={reservationNotesOpen}
    title="Reservation notes"
    notes={s.resnotes}
    placeholder="Anything the office should know about this stay…"
    save={(text) => setReservationNotes(s.reservationid, text)}
/>
<PartySizeDialog bind:open={guestsOpen} {s} {occupancy} />
<ChangeDatesDialog bind:open={datesOpen} {s} {today} />
<RoomMoveDialog bind:open={moveOpen} {s} {occupancy} {today} />
<ChangeRoomDialog bind:open={changeOpen} target={changeTarget} />
<UndoMoveDialog bind:open={undoOpen} target={undoTarget} {occupancy} {moves} />

<CancelDialog
    bind:open={cancelOpen}
    resnumber={s.resnumber}
    depositAmount={deposit}
    {today}
    onconfirm={onCancelled}
/>

{#if deposit}
    <SettleDepositDialog
        bind:open={settleOpen}
        resnumber={s.resnumber}
        depositAmount={deposit}
        {today}
        onconfirm={onSettled}
    />
{/if}
