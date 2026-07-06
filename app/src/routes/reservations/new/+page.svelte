<script lang="ts">
    import { goto } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
    import SearchIcon from "@lucide/svelte/icons/search";
    import UserCheckIcon from "@lucide/svelte/icons/user-check";
    import XIcon from "@lucide/svelte/icons/x";
    import AlertTriangleIcon from "@lucide/svelte/icons/triangle-alert";
    import SaveIcon from "@lucide/svelte/icons/save";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Select from "$lib/components/ui/select/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import {
        BED_TYPES,
        ROOMS,
        SALUTATIONS,
        roomOptionLabel,
    } from "$lib/data/reference.js";
    import { searchGuestsByName } from "$lib/data/queries.js";
    import { createGuest, createReservation } from "$lib/data/mutations.js";
    import { supabase } from "$lib/data/client.js";
    import { dateMed, nightsBetween } from "$lib/format.js";
    import type { GuestSearchRow } from "$lib/data/types.js";

    let { data } = $props();

    function seed() {
        const g = data.guest;
        return {
            attachedGuestId: g?.guestid ?? null,
            salutation: g?.guestsalutation ?? "",
            firstName: g?.guestfirstname ?? "",
            lastName: g?.guestlastname ?? "",
            company: g?.guestcompany ?? "",
            address: g?.guestaddress ?? "",
            city: g?.guestcity ?? "",
            region: g?.guestregion ?? "",
            country: g?.guestcountry ?? "CAN",
            postal: g?.guestpczip ?? "",
            phone: g?.guestprimaryphone ?? "",
            email: g?.guestemailaddress ?? "",
        };
    }
    const i = seed();

    // Guest fields
    let attachedGuestId = $state<number | null>(i.attachedGuestId);
    let salutation = $state(i.salutation);
    let firstName = $state(i.firstName);
    let lastName = $state(i.lastName);
    let company = $state(i.company);
    let address = $state(i.address);
    let city = $state(i.city);
    let region = $state(i.region);
    let country = $state(i.country);
    let postal = $state(i.postal);
    let phone = $state(i.phone);
    let email = $state(i.email);

    // Guest typeahead
    let guestQuery = $state("");
    let guestMatches = $state<GuestSearchRow[]>([]);
    $effect(() => {
        const q = guestQuery.trim();
        if (!q) {
            guestMatches = [];
            return;
        }
        let alive = true;
        const timer = setTimeout(async () => {
            const rows = await searchGuestsByName(q);
            if (alive) guestMatches = rows.slice(0, 6);
        }, 150);
        return () => {
            alive = false;
            clearTimeout(timer);
        };
    });

    function attachSearchRow(g: GuestSearchRow) {
        attachedGuestId = g.guestid;
        lastName = g.guestlastname;
        firstName = g.guestfirstname ?? "";
        city = g.guestcity ?? "";
        region = g.guestregion ?? "";
        phone = g.guestprimaryphone ?? "";
        email = g.guestemailaddress ?? "";
        guestQuery = "";
    }

    function clearGuest() {
        attachedGuestId = null;
        salutation =
            firstName =
            lastName =
            company =
            address =
            city =
            region =
            postal =
            phone =
            email =
                "";
        country = "CAN";
    }

    // Reservation fields
    let arrival = $state("");
    let departure = $state("");
    let adults = $state(2);
    let children = $state(0);
    let bedType = $state("Double");
    let arrivalTime = $state("");
    let groupName = $state("");

    // Booked-by initials (ypl.reservations.resbookedby), defaulted from the
    // signed-in staff account and editable before saving.
    let bookedBy = $state("FD");
    supabase.auth.getUser().then(({ data }) => {
        const email = data.user?.email;
        if (email) bookedBy = email.slice(0, 2).toUpperCase();
    });

    // Room
    let roomId = $state(String(ROOMS[0].roomid));
    const roomLabel = $derived(
        roomOptionLabel(
            ROOMS.find((r) => String(r.roomid) === roomId) ?? ROOMS[0],
        ),
    );

    const nights = $derived(
        arrival && departure ? nightsBetween(arrival, departure) : 0,
    );
    const tooFarAhead = $derived(!!arrival && arrival > data.maxDate);
    const badRange = $derived(!!arrival && !!departure && departure <= arrival);
    let saving = $state(false);
    const canSave = $derived(
        !!lastName.trim() &&
            !!arrival &&
            !!departure &&
            !!bookedBy.trim() &&
            !tooFarAhead &&
            !badRange &&
            !saving,
    );

    async function save() {
        if (!canSave) {
            toast.error("Add a last name and valid arrival/departure dates.");
            return;
        }
        saving = true;
        try {
            const guestid =
                attachedGuestId ??
                (await createGuest({
                    lastname: lastName.trim(),
                    firstname: firstName.trim() || null,
                    salutation: salutation || null,
                    address: address.trim() || null,
                    city: city.trim() || null,
                    region: region.trim() || null,
                    country: country.trim() || null,
                    pczip: postal.trim() || null,
                    primaryphone: phone.trim() || null,
                    email: email.trim() || null,
                    company: company.trim() || null,
                }));
            const created = await createReservation({
                guestid,
                arrival,
                departure,
                bookedby: bookedBy.trim(),
                numadults: adults,
                numchildren: children,
                bedtype: bedType,
                arrivaltime: arrivalTime.trim() || null,
                groupname: groupName.trim() || null,
                roomid: Number(roomId) || null,
                numguests: adults + children,
            });
            toast.success(`Reservation #${created.resnumber} created`, {
                description: `${lastName}${firstName ? ", " + firstName : ""} · ${dateMed(arrival)} → ${dateMed(departure)}`,
            });
            await goto(`/reservations/${created.resnumber}`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not save the reservation.");
        } finally {
            saving = false;
        }
    }
</script>

<svelte:head><title>New reservation</title></svelte:head>

<div class="mb-5 flex items-center justify-between gap-3">
    <Button variant="ghost" size="sm" href="/"><ArrowLeftIcon /> Lookup</Button>
    <h1 class="text-lg font-semibold">New reservation</h1>
    <Button onclick={save} disabled={!canSave}
        ><SaveIcon /> Save reservation</Button
    >
</div>

<div class="grid items-start gap-5 lg:grid-cols-2">
    <!-- Guest -->
    <Card.Root>
        <Card.Header class="border-b pb-4">
            <Card.Title class="text-base">Guest</Card.Title>
            <Card.Description
                >Attach an existing guest or enter a new one.</Card.Description
            >
        </Card.Header>
        <Card.Content class="space-y-4">
            {#if attachedGuestId}
                <div
                    class="bg-accent/60 flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                    <span class="flex items-center gap-2 text-sm font-medium">
                        <UserCheckIcon class="text-primary size-4" /> Existing guest
                        #{attachedGuestId}
                    </span>
                    <Button variant="ghost" size="sm" onclick={clearGuest}
                        ><XIcon /> Use a new guest</Button
                    >
                </div>
            {:else}
                <div class="relative">
                    <SearchIcon
                        class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                    />
                    <Input
                        bind:value={guestQuery}
                        placeholder="Find an existing guest by name…"
                        class="pl-9"
                        autocomplete="off"
                    />
                    {#if guestMatches.length}
                        <div
                            class="bg-popover absolute z-20 mt-1 w-full overflow-hidden rounded-lg border shadow-md"
                        >
                            {#each guestMatches as g (g.guestid)}
                                <button
                                    type="button"
                                    class="hover:bg-accent flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-0"
                                    onclick={() => attachSearchRow(g)}
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
            {/if}

            <div class="grid grid-cols-[90px_1fr] gap-3">
                <div class="space-y-1.5">
                    <Label>Title</Label>
                    <Select.Root type="single" bind:value={salutation}>
                        <Select.Trigger class="w-full"
                            >{salutation || "—"}</Select.Trigger
                        >
                        <Select.Content>
                            {#each SALUTATIONS as slt (slt)}<Select.Item
                                    value={slt}
                                    label={slt}>{slt}</Select.Item
                                >{/each}
                        </Select.Content>
                    </Select.Root>
                </div>
                <div class="space-y-1.5">
                    <Label for="fn">First name</Label><Input
                        id="fn"
                        bind:value={firstName}
                    />
                </div>
            </div>
            <div class="space-y-1.5">
                <Label for="ln"
                    >Last name <span class="text-destructive">*</span></Label
                >
                <Input
                    id="ln"
                    bind:value={lastName}
                    aria-invalid={!lastName.trim()}
                />
            </div>
            <div class="space-y-1.5">
                <Label for="co">Company (optional)</Label><Input
                    id="co"
                    bind:value={company}
                />
            </div>
            <div class="space-y-1.5">
                <Label for="ad">Address</Label><Input
                    id="ad"
                    bind:value={address}
                />
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                    <Label for="ci">City</Label><Input
                        id="ci"
                        bind:value={city}
                    />
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1.5">
                        <Label for="rg">Prov</Label><Input
                            id="rg"
                            bind:value={region}
                            maxlength={2}
                        />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="pc">Postal</Label><Input
                            id="pc"
                            bind:value={postal}
                        />
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                    <Label for="cn">Country</Label><Input
                        id="cn"
                        bind:value={country}
                        maxlength={3}
                    />
                </div>
                <div class="space-y-1.5">
                    <Label for="ph">Phone</Label><Input
                        id="ph"
                        bind:value={phone}
                    />
                </div>
            </div>
            <div class="space-y-1.5">
                <Label for="em">Email</Label><Input
                    id="em"
                    type="email"
                    bind:value={email}
                />
            </div>
        </Card.Content>
    </Card.Root>

    <!-- Reservation + room -->
    <div class="space-y-5">
        <Card.Root>
            <Card.Header class="border-b pb-4">
                <div class="flex items-center justify-between">
                    <Card.Title class="text-base">Reservation</Card.Title>
                    <Badge variant="secondary">Res # assigned on save</Badge>
                </div>
            </Card.Header>
            <Card.Content class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1.5">
                        <Label for="arr"
                            >Arrival <span class="text-destructive">*</span
                            ></Label
                        >
                        <Input
                            id="arr"
                            type="date"
                            bind:value={arrival}
                            min={data.today}
                            max={data.maxDate}
                            aria-invalid={tooFarAhead}
                        />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="dep"
                            >Departure <span class="text-destructive">*</span
                            ></Label
                        >
                        <Input
                            id="dep"
                            type="date"
                            bind:value={departure}
                            min={arrival || data.today}
                            aria-invalid={badRange}
                        />
                    </div>
                </div>

                {#if tooFarAhead}
                    <div
                        class="text-destructive flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs"
                    >
                        <AlertTriangleIcon class="size-4 shrink-0" />
                        The lodge books only one year ahead. Latest arrival is {dateMed(
                            data.maxDate,
                        )}.
                    </div>
                {:else if nights > 0}
                    <p class="text-muted-foreground text-xs">
                        {nights} night{nights === 1 ? "" : "s"}.
                    </p>
                {/if}

                <div class="grid grid-cols-3 gap-3">
                    <div class="space-y-1.5">
                        <Label for="ad2">Adults</Label><Input
                            id="ad2"
                            type="number"
                            min="1"
                            bind:value={adults}
                        />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="ch">Children</Label><Input
                            id="ch"
                            type="number"
                            min="0"
                            bind:value={children}
                        />
                    </div>
                    <div class="space-y-1.5">
                        <Label>Bed type</Label>
                        <Select.Root type="single" bind:value={bedType}>
                            <Select.Trigger class="w-full"
                                >{bedType}</Select.Trigger
                            >
                            <Select.Content>
                                {#each BED_TYPES as b (b)}<Select.Item
                                        value={b}
                                        label={b}>{b}</Select.Item
                                    >{/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1.5">
                        <Label for="at">Arrival time</Label><Input
                            id="at"
                            bind:value={arrivalTime}
                            placeholder="e.g. 3:00 PM"
                        />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="gn">Group (optional)</Label><Input
                            id="gn"
                            bind:value={groupName}
                        />
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1.5">
                        <Label for="bb">Booked by (initials)</Label><Input
                            id="bb"
                            bind:value={bookedBy}
                            maxlength={3}
                            class="uppercase"
                        />
                    </div>
                </div>
            </Card.Content>
        </Card.Root>

        <Card.Root>
            <Card.Header class="border-b pb-4">
                <Card.Title class="text-base">Room</Card.Title>
            </Card.Header>
            <Card.Content class="space-y-3">
                <div class="space-y-1.5">
                    <Label>Room</Label>
                    <Select.Root type="single" bind:value={roomId}>
                        <Select.Trigger class="w-full"
                            >{roomLabel}</Select.Trigger
                        >
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
                        Bed layout shown beside each room. Add room moves later
                        from the reservation.
                    </p>
                </div>
            </Card.Content>
        </Card.Root>
    </div>
</div>
