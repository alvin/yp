<script lang="ts">
    import { toast } from "svelte-sonner";
    import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
    import NotebookIcon from "@lucide/svelte/icons/notebook-pen";
    import EyeOffIcon from "@lucide/svelte/icons/eye-off";
    import UsersIcon from "@lucide/svelte/icons/users";
    import CarIcon from "@lucide/svelte/icons/car";
    import BedIcon from "@lucide/svelte/icons/bed-double";
    import PlusIcon from "@lucide/svelte/icons/plus";
    import RepeatIcon from "@lucide/svelte/icons/repeat-2";
    import CheckIcon from "@lucide/svelte/icons/check";
    import UserPlusIcon from "@lucide/svelte/icons/user-plus";
    import XCircleIcon from "@lucide/svelte/icons/circle-x";
    import FileTextIcon from "@lucide/svelte/icons/file-text";
    import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import * as Select from "$lib/components/ui/select/index.js";
    import Field from "$lib/components/app/field.svelte";
    import Money from "$lib/components/app/money.svelte";
    import StatusBadge from "$lib/components/app/status-badge.svelte";
    import ReservationLedger from "$lib/components/app/reservation-ledger.svelte";
    import CancelDialog from "$lib/components/app/cancel-dialog.svelte";
    import { goto, invalidateAll } from "$app/navigation";
    import { dateMed, dateShort, nightsBetween } from "$lib/format.js";
    import { ROOMS, roomById, roomOptionLabel } from "$lib/data/reference.js";
    import { occupancySummaries } from "$lib/data/queries.js";
    import {
        addHousekeepingNote,
        addReservationGuest,
        assignRoom,
        cancelReservation,
        confirmReservation,
        createGuest,
        rebookReservation,
        recordRoomMove,
        saveKitchenMeal,
        setGuestNotes,
        setReservationNotes,
        updateReservationGuestNotes,
    } from "$lib/data/mutations.js";
    import { searchGuestsByName } from "$lib/data/queries.js";
    import type {
        GuestSearchRow,
        OccupancySummary,
    } from "$lib/data/types.js";

    let { data } = $props();
    const s = $derived(data.summary);
    const today = $derived(data.today);

    function seed() {
        const d = data;
        return {
            cancelled: d.summary.rescancelled,
            occupancy: d.occupancy,
            mIn: d.today,
            mOut: d.summary.resdeparturedate,
            kitchenText: d.kitchen
                .map((k) =>
                    [k.guestdiet, k.kitchenmealnotes]
                        .filter(Boolean)
                        .join(" — "),
                )
                .join("\n"),
            housekeepingText: d.housekeeping
                .map((h) => h.housekeepingnotes)
                .filter(Boolean)
                .join("\n"),
            requestText: d.reservationGuests
                .map((g) => g.rgnotes)
                .filter(Boolean)
                .join("\n"),
            reservationText: d.summary.resnotes ?? "",
        };
    }
    const i = seed();

    let cancelled = $state(i.cancelled);

    const statusToday = $derived.by(() => {
        if (cancelled) return "cancelled";
        if (s.resarrivaldate === today) return "Arrive Today";
        if (s.resdeparturedate === today) return "Depart Today";
        if (today > s.resarrivaldate && today < s.resdeparturedate)
            return "In House";
        return s.resarrivaldate > today ? "future" : "past";
    });

    const deposit = $derived(
        data.ledger.find((l) => l.line_type === "Deposit (Received)")?.amount ??
            null,
    );

    // Guest notes (office only) — editable, saved to the guest record.
    let notesOpen = $state(false);
    let guestNotesText = $state("");
    let savingGuestNotes = $state(false);
    function openGuestNotes() {
        guestNotesText = data.guestNotes ?? "";
        notesOpen = true;
    }
    async function saveGuestNotes() {
        savingGuestNotes = true;
        try {
            await setGuestNotes(s.primary_guestid, guestNotesText);
            notesOpen = false;
            toast.success("Guest notes saved (office only — never printed)");
            await invalidateAll();
        } catch (e) {
            toast.error(
                e instanceof Error ? e.message : "Could not save guest notes.",
            );
        } finally {
            savingGuestNotes = false;
        }
    }

    // Confirm
    let confirming = $state(false);
    async function markConfirmed() {
        confirming = true;
        try {
            await confirmReservation(s.reservationid);
            toast.success(`Reservation #${s.resnumber} confirmed`);
            await invalidateAll();
        } catch (e) {
            toast.error(
                e instanceof Error ? e.message : "Could not confirm.",
            );
        } finally {
            confirming = false;
        }
    }

    // Re-book: new dates for the same guests; deposits transfer and the
    // original reservation is cancelled (all handled in the database).
    let rebookOpen = $state(false);
    let rbArrival = $state("");
    let rbDeparture = $state("");
    let rebooking = $state(false);
    function openRebook() {
        rbArrival = "";
        rbDeparture = "";
        rebookOpen = true;
    }
    async function doRebook() {
        if (!rbArrival || !rbDeparture || rbDeparture <= rbArrival) {
            toast.error("Enter valid new arrival and departure dates.");
            return;
        }
        rebooking = true;
        try {
            const created = await rebookReservation(
                s.reservationid,
                rbArrival,
                rbDeparture,
                s.resbookedby,
            );
            rebookOpen = false;
            toast.success(`Re-booked as #${created.resnumber}`, {
                description:
                    "Deposit transferred; original reservation cancelled.",
            });
            await goto(`/reservations/${created.resnumber}`);
        } catch (e) {
            toast.error(
                e instanceof Error ? e.message : "Could not re-book.",
            );
        } finally {
            rebooking = false;
        }
    }

    // Rooms: mid-stay moves (split the current occupancy at the move date)
    // or an additional room for the same stay.
    let occupancy = $state<OccupancySummary[]>(i.occupancy);
    let moveOpen = $state(false);
    let mMode = $state<"move" | "add">("move");
    let mFrom = $state("");
    let mRoom = $state(String(ROOMS[0].roomid));
    let mMoveDate = $state(i.mIn);
    let mIn = $state(i.mIn);
    let mOut = $state(i.mOut);
    let mGuests = $state(2);
    let mNotes = $state("");
    const mRoomLabel = $derived(
        roomOptionLabel(roomById(Number(mRoom)) ?? ROOMS[0]),
    );
    const mFromLabel = $derived(
        occupancy.find((o) => String(o.occupancyid) === mFrom)?.room_compact ??
            "Select room",
    );

    function openMove() {
        mMode = occupancy.length ? "move" : "add";
        const current =
            occupancy.find(
                (o) => o.occupancyin <= today && o.occupancyout >= today,
            ) ?? occupancy[occupancy.length - 1];
        mFrom = current ? String(current.occupancyid) : "";
        mMoveDate = today;
        mIn = today;
        mOut = s.resdeparturedate;
        mGuests = current?.occupancynumguests ?? s.numadults;
        mNotes = "";
        moveOpen = true;
    }

    async function addMove() {
        const room = roomById(Number(mRoom))!;
        try {
            if (mMode === "move") {
                if (!mFrom) {
                    toast.error("Choose the room being left.");
                    return;
                }
                await recordRoomMove(
                    Number(mFrom),
                    room.roomid,
                    mMoveDate,
                    mNotes || null,
                );
            } else {
                await assignRoom(
                    s.primary_reservationguestid,
                    room.roomid,
                    mIn,
                    mOut,
                    mGuests,
                    mNotes || null,
                );
            }
            occupancy = await occupancySummaries(s.reservationid);
            moveOpen = false;
            toast.success(
                `${mMode === "move" ? "Room move recorded" : "Room added"} — ${room.roomname}${room.roomnumber ? " " + room.roomnumber : ""}`,
            );
        } catch (e) {
            toast.error(
                e instanceof Error ? e.message : "Could not save the room move.",
            );
        }
    }

    // Additional guest names on the reservation
    let addGuestOpen = $state(false);
    let agQuery = $state("");
    let agMatches = $state<GuestSearchRow[]>([]);
    let agLastName = $state("");
    let agFirstName = $state("");
    let agSaving = $state(false);
    $effect(() => {
        const q = agQuery.trim();
        if (!addGuestOpen || !q) {
            agMatches = [];
            return;
        }
        let alive = true;
        const timer = setTimeout(async () => {
            const rows = await searchGuestsByName(q);
            if (alive) agMatches = rows.slice(0, 6);
        }, 150);
        return () => {
            alive = false;
            clearTimeout(timer);
        };
    });
    async function attachGuest(guestid: number, label: string) {
        agSaving = true;
        try {
            await addReservationGuest(s.reservationid, guestid);
            addGuestOpen = false;
            agQuery = agLastName = agFirstName = "";
            toast.success(`${label} added to the reservation`);
            await invalidateAll();
        } catch (e) {
            toast.error(
                e instanceof Error ? e.message : "Could not add the guest.",
            );
        } finally {
            agSaving = false;
        }
    }
    async function addNewGuestToReservation() {
        if (!agLastName.trim()) {
            toast.error("Enter at least a last name.");
            return;
        }
        agSaving = true;
        try {
            const guestid = await createGuest({
                lastname: agLastName.trim(),
                firstname: agFirstName.trim() || null,
            });
            agSaving = false;
            await attachGuest(
                guestid,
                `${agLastName.trim()}${agFirstName.trim() ? ", " + agFirstName.trim() : ""}`,
            );
        } catch (e) {
            agSaving = false;
            toast.error(
                e instanceof Error ? e.message : "Could not add the guest.",
            );
        }
    }

    // Notes tabs (report-feeding)
    let kitchenText = $state(i.kitchenText);
    let housekeepingText = $state(i.housekeepingText);
    let requestText = $state(i.requestText);
    let reservationText = $state(i.reservationText);
    async function saveNotes(which: string) {
        try {
            if (which === "Kitchen") {
                const meal = data.kitchen.find(
                    (k) => k.guestid === s.primary_guestid,
                );
                await saveKitchenMeal(
                    s.primary_guestid,
                    meal?.guestdiet ?? "",
                    kitchenText,
                    meal?.kitchenmealid ?? null,
                );
            } else if (which === "Housekeeping") {
                await addHousekeepingNote(
                    s.primary_reservationguestid,
                    housekeepingText,
                    today,
                );
            } else if (which === "Request") {
                await updateReservationGuestNotes(
                    s.primary_reservationguestid,
                    requestText,
                );
            } else {
                await setReservationNotes(s.reservationid, reservationText);
            }
            toast.success(`${which} notes saved`);
        } catch (e) {
            toast.error(
                e instanceof Error
                    ? e.message
                    : `Could not save ${which} notes.`,
            );
        }
    }

    // Cancel
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
            cancelled = true;
            if (r.notes) reservationText = r.notes;
            toast.success(`Reservation #${s.resnumber} cancelled`, {
                description: r.outcome !== "none" ? r.outcome : undefined,
            });
            await invalidateAll();
        } catch (e) {
            toast.error(
                e instanceof Error
                    ? e.message
                    : "Could not cancel the reservation.",
            );
        }
    }

    const docs = $derived([
        { label: "Confirmation", href: `/reports/confirmation/${s.resnumber}` },
        {
            label: "Check-in folio",
            href: `/reports/check-in-folio/${s.resnumber}`,
        },
        {
            label: "Check-out bill",
            href: `/reports/checkout-bill/${s.resnumber}`,
        },
        { label: "Cancellation", href: `/reports/cancellation/${s.resnumber}` },
    ]);
</script>

<svelte:head
    ><title>Reservation #{s.resnumber} · {s.guest_name}</title></svelte:head
>

<!-- Action bar -->
<div class="mb-5 flex flex-wrap items-center gap-3">
    <Button variant="ghost" size="sm" href="/"><ArrowLeftIcon /> Lookup</Button>
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
        <Button variant="outline" size="sm" onclick={openRebook}>
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
        {/if}
    </div>
</div>

<div class="grid items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
    <!-- Left: guest, reservation, rooms, notes -->
    <div class="space-y-5">
        <!-- Guests -->
        <Card.Root>
            <Card.Header class="border-b pb-4">
                <div class="flex items-center justify-between">
                    <Card.Title class="flex items-center gap-2 text-base"
                        ><UsersIcon class="size-4" /> Guests</Card.Title
                    >
                    <div class="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onclick={() => (addGuestOpen = true)}
                        >
                            <UserPlusIcon /> Add guest
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onclick={openGuestNotes}
                        >
                            <NotebookIcon /> Guest notes
                            {#if data.guestNotes}<span
                                    class="bg-primary ml-1 size-1.5 rounded-full"
                                ></span>{/if}
                        </Button>
                    </div>
                </div>
            </Card.Header>
            <Card.Content class="divide-y p-0">
                {#each data.reservationGuests as g (g.reservationguestid)}
                    <div
                        class="flex items-start justify-between gap-3 px-6 py-3"
                    >
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <a
                                    href="/guests/{g.guestid}"
                                    class="font-medium hover:underline"
                                    >{g.guest_name}</a
                                >
                                {#if g.primaryguest}<Badge
                                        variant="secondary"
                                        class="text-[10px]">Primary</Badge
                                    >{/if}
                                {#if g.guestinhouse}<Badge
                                        variant="success"
                                        class="text-[10px]">In house</Badge
                                    >{/if}
                            </div>
                            <div
                                class="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs"
                            >
                                <span>{g.percentageofbill}% of bill</span>
                                {#if g.vehicledescription}
                                    <span class="flex items-center gap-1"
                                        ><CarIcon class="size-3" />
                                        {g.vehicledescription}{#if g.vehiclelicenseplate}
                                            · {g.vehiclelicenseplate}{/if}</span
                                    >
                                {/if}
                            </div>
                        </div>
                        <Money
                            value={g.balance_owing}
                            muteZero
                            class="shrink-0 text-sm font-medium"
                        />
                    </div>
                {/each}
            </Card.Content>
        </Card.Root>

        <!-- Reservation details -->
        <Card.Root>
            <Card.Header class="border-b pb-4">
                <Card.Title class="text-base">Reservation details</Card.Title>
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
                        value={s.numnights ??
                            nightsBetween(s.resarrivaldate, s.resdeparturedate)}
                    />
                    <Field
                        label="Guests"
                        value={`${s.numadults} adult${s.numadults === 1 ? "" : "s"}${s.numchildren ? `, ${s.numchildren} child` : ""}`}
                    />
                    <Field label="Bed type" value={s.bedtype} />
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
                    <Button variant="outline" size="sm" onclick={openMove}
                        ><PlusIcon /> Room move</Button
                    >
                </div>
            </Card.Header>
            <Card.Content class="space-y-2">
                {#each occupancy as o (o.occupancyid)}
                    <div
                        class="bg-muted/40 flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
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
                        </div>
                    </div>
                {/each}
            </Card.Content>
        </Card.Root>

        <!-- Report-feeding notes -->
        <Card.Root>
            <Card.Header class="border-b pb-4">
                <Card.Title class="text-base">Notes for reports</Card.Title>
                <Card.Description
                    >Print on kitchen, housekeeping, and in-house reports. Guest
                    notes stay office-only.</Card.Description
                >
            </Card.Header>
            <Card.Content>
                <Tabs.Root value="kitchen">
                    <Tabs.List class="grid w-full grid-cols-4">
                        <Tabs.Trigger value="kitchen">Kitchen</Tabs.Trigger>
                        <Tabs.Trigger value="hk">Housekeeping</Tabs.Trigger>
                        <Tabs.Trigger value="req">Requests</Tabs.Trigger>
                        <Tabs.Trigger value="res">Reservation</Tabs.Trigger>
                    </Tabs.List>
                    <Tabs.Content value="kitchen" class="mt-3 space-y-2">
                        <Textarea
                            bind:value={kitchenText}
                            rows={4}
                            placeholder="Diet, allergies, meal preferences"
                        />
                        <p class="text-muted-foreground text-xs">
                            Feeds into → Kitchen / Meal reports.
                        </p>
                        <Button
                            size="sm"
                            variant="secondary"
                            onclick={() => saveNotes("Kitchen")}>Save</Button
                        >
                    </Tabs.Content>
                    <Tabs.Content value="hk" class="mt-3 space-y-2">
                        <Textarea
                            bind:value={housekeepingText}
                            rows={4}
                            placeholder="Bed setup, room readiness"
                        />
                        <p class="text-muted-foreground text-xs">
                            Feeds into → Housekeeping report, with the note
                            date.
                        </p>
                        <Button
                            size="sm"
                            variant="secondary"
                            onclick={() => saveNotes("Housekeeping")}
                            >Save</Button
                        >
                    </Tabs.Content>
                    <Tabs.Content value="req" class="mt-3 space-y-2">
                        <Textarea
                            bind:value={requestText}
                            rows={4}
                            placeholder="Occupancy & in-house requests"
                        />
                        <p class="text-muted-foreground text-xs">
                            Feeds into → In-House report; used for room
                            assignment.
                        </p>
                        <Button
                            size="sm"
                            variant="secondary"
                            onclick={() => saveNotes("Request")}>Save</Button
                        >
                    </Tabs.Content>
                    <Tabs.Content value="res" class="mt-3 space-y-2">
                        <Textarea
                            bind:value={reservationText}
                            rows={4}
                            placeholder="Reservation message"
                        />
                        <p class="text-muted-foreground text-xs">
                            Feeds into → Confirmation slip and cancellation
                            notice.
                        </p>
                        <Button
                            size="sm"
                            variant="secondary"
                            onclick={() => saveNotes("Reservation")}
                            >Save</Button
                        >
                    </Tabs.Content>
                </Tabs.Root>
            </Card.Content>
        </Card.Root>
    </div>

    <!-- Right: ledger + print -->
    <div class="space-y-5 lg:sticky lg:top-20">
        <ReservationLedger
            reservationid={s.reservationid}
            initialLines={data.ledger}
            reservationGuests={data.reservationGuests}
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

<!-- Guest notes dialog -->
<Dialog.Root bind:open={notesOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2"
                ><NotebookIcon class="size-4" /> Guest notes</Dialog.Title
            >
            <Dialog.Description class="flex items-center gap-1.5">
                <EyeOffIcon class="size-3.5" /> Office only — never printed on any
                document.
            </Dialog.Description>
        </Dialog.Header>
        <Textarea
            bind:value={guestNotesText}
            rows={6}
            placeholder="Preferences, history, anything the office should know…"
        />
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (notesOpen = false)}
                >Close</Button
            >
            <Button onclick={saveGuestNotes} disabled={savingGuestNotes}
                >Save notes</Button
            >
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<!-- Add guest dialog -->
<Dialog.Root bind:open={addGuestOpen}>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>Add a guest name</Dialog.Title>
            <Dialog.Description>
                Everyone attached shows on this reservation and prints on its
                documents.
            </Dialog.Description>
        </Dialog.Header>
        <div class="space-y-3">
            <div class="space-y-1.5">
                <Label for="ag-q">Find an existing guest</Label>
                <Input
                    id="ag-q"
                    bind:value={agQuery}
                    placeholder="Type a name…"
                    autocomplete="off"
                />
                {#if agMatches.length}
                    <div class="overflow-hidden rounded-lg border">
                        {#each agMatches as g (g.guestid)}
                            <button
                                type="button"
                                class="hover:bg-accent flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-0"
                                disabled={agSaving}
                                onclick={() =>
                                    attachGuest(g.guestid, g.guest_name)}
                            >
                                <span>{g.guest_name}</span>
                                <span class="text-muted-foreground text-xs"
                                    >{[g.guestcity, g.guestregion]
                                        .filter(Boolean)
                                        .join(", ")}</span
                                >
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
            <div class="text-muted-foreground text-center text-xs">
                — or add a new name —
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                    <Label for="ag-ln">Last name</Label>
                    <Input id="ag-ln" bind:value={agLastName} />
                </div>
                <div class="space-y-1.5">
                    <Label for="ag-fn">First name</Label>
                    <Input id="ag-fn" bind:value={agFirstName} />
                </div>
            </div>
        </div>
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (addGuestOpen = false)}
                >Cancel</Button
            >
            <Button
                onclick={addNewGuestToReservation}
                disabled={agSaving || !agLastName.trim()}
            >
                <UserPlusIcon /> Add guest
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<!-- Re-book dialog -->
<Dialog.Root bind:open={rebookOpen}>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>Re-book reservation #{s.resnumber}</Dialog.Title>
            <Dialog.Description>
                Creates a new reservation for the same guests. Any deposit on
                file transfers to the new stay and this reservation is
                cancelled.
            </Dialog.Description>
        </Dialog.Header>
        <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
                <Label for="rb-arr">New arrival</Label>
                <Input id="rb-arr" type="date" bind:value={rbArrival} />
            </div>
            <div class="space-y-1.5">
                <Label for="rb-dep">New departure</Label>
                <Input
                    id="rb-dep"
                    type="date"
                    bind:value={rbDeparture}
                    min={rbArrival}
                />
            </div>
        </div>
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (rebookOpen = false)}
                >Keep as is</Button
            >
            <Button onclick={doRebook} disabled={rebooking}>
                <RepeatIcon /> Re-book
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<!-- Room move dialog -->
<Dialog.Root bind:open={moveOpen}>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>
                {mMode === "move" ? "Move rooms" : "Add a room"}
            </Dialog.Title>
            <Dialog.Description
                >Both rooms stay on file for history and reports.</Dialog.Description
            >
        </Dialog.Header>
        <div class="space-y-3">
            <div class="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
                <button
                    type="button"
                    class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {mMode ===
                    'move'
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground'}"
                    onclick={() => (mMode = "move")}>Move rooms</button
                >
                <button
                    type="button"
                    class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {mMode ===
                    'add'
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground'}"
                    onclick={() => (mMode = "add")}>Add another room</button
                >
            </div>

            {#if mMode === "move"}
                <div class="space-y-1.5">
                    <Label>Room being left</Label>
                    <Select.Root type="single" bind:value={mFrom}>
                        <Select.Trigger class="w-full"
                            >{mFromLabel}</Select.Trigger
                        >
                        <Select.Content>
                            {#each occupancy as o (o.occupancyid)}
                                <Select.Item
                                    value={String(o.occupancyid)}
                                    label={`${o.room_compact} · ${dateShort(o.occupancyin)} → ${dateShort(o.occupancyout)}`}
                                >
                                    {o.room_compact} · {dateShort(
                                        o.occupancyin,
                                    )} → {dateShort(o.occupancyout)}
                                </Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
            {/if}

            <div class="space-y-1.5">
                <Label>{mMode === "move" ? "New room" : "Room"}</Label>
                <Select.Root type="single" bind:value={mRoom}>
                    <Select.Trigger class="w-full">{mRoomLabel}</Select.Trigger>
                    <Select.Content>
                        {#each ROOMS as r (r.roomid)}
                            <Select.Item
                                value={String(r.roomid)}
                                label={roomOptionLabel(r)}
                                >{roomOptionLabel(r)}</Select.Item
                            >
                        {/each}
                    </Select.Content>
                </Select.Root>
                <p class="text-muted-foreground text-xs">
                    Bed layout shown beside each room.
                </p>
            </div>

            {#if mMode === "move"}
                <div class="space-y-1.5">
                    <Label for="m-date">Move date</Label>
                    <Input id="m-date" type="date" bind:value={mMoveDate} />
                    <p class="text-muted-foreground text-xs">
                        The room being left keeps its history up to this date;
                        the new room takes over from it.
                    </p>
                </div>
            {:else}
                <div class="grid grid-cols-3 gap-3">
                    <div class="space-y-1.5">
                        <Label for="m-in">In</Label><Input
                            id="m-in"
                            type="date"
                            bind:value={mIn}
                        />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="m-out">Out</Label><Input
                            id="m-out"
                            type="date"
                            bind:value={mOut}
                            min={mIn}
                        />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="m-g">Guests</Label><Input
                            id="m-g"
                            type="number"
                            min="1"
                            bind:value={mGuests}
                        />
                    </div>
                </div>
            {/if}
            <div class="space-y-1.5">
                <Label for="m-n">Notes</Label><Input
                    id="m-n"
                    bind:value={mNotes}
                    placeholder="e.g. Moved per guest request"
                />
            </div>
        </div>
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (moveOpen = false)}
                >Cancel</Button
            >
            <Button onclick={addMove}>
                {mMode === "move" ? "Record move" : "Add room"}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<CancelDialog
    bind:open={cancelOpen}
    resnumber={s.resnumber}
    depositAmount={deposit}
    {today}
    onconfirm={onCancelled}
/>
