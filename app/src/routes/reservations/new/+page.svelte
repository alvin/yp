<script lang="ts">
    import { goto } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
    import UserCheckIcon from "@lucide/svelte/icons/user-check";
    import XIcon from "@lucide/svelte/icons/x";
    import AlertTriangleIcon from "@lucide/svelte/icons/triangle-alert";
    import SaveIcon from "@lucide/svelte/icons/save";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Combobox } from "$lib/components/ui/combobox/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import ChargeBasket from "$lib/components/app/charge-basket.svelte";
    import GuestSearch from "$lib/components/app/guest-search.svelte";
    import PhoneInput from "$lib/components/app/phone-input.svelte";
    import { GUEST_DIETS, SALUTATIONS } from "$lib/data/reference.js";
    import { bedTypeOptions, roomOptions, textOptions } from "$lib/options.js";
    import { getGuest, guestKitchenMeal } from "$lib/data/queries.js";
    import {
        addHousekeepingNote,
        createGuest,
        createReservation,
        saveKitchenMeal,
    } from "$lib/data/mutations.js";
    import { postPendingLines, type PendingLine } from "$lib/pending-charges.js";
    import { supabase } from "$lib/data/client.js";
    import { dateMed, nightsBetween } from "$lib/format.js";
    import type { GuestSearchRow } from "$lib/data/types.js";

    let { data } = $props();

    function seed() {
        const g = data.guest;
        const k = data.kitchen;
        return {
            attachedGuestId: g?.guestid ?? null,
            salutation: g?.guestsalutation ?? "",
            firstName: g?.guestfirstname ?? "",
            lastName: g?.guestlastname ?? "",
            address: g?.guestaddress ?? "",
            city: g?.guestcity ?? "",
            region: g?.guestregion ?? "",
            country: g?.guestcountry ?? "CAN",
            postal: g?.guestpczip ?? "",
            phone: g?.guestprimaryphone ?? "",
            email: g?.guestemailaddress ?? "",
            kitchenMealId: k?.kitchenmealid ?? null,
            diet: k?.guestdiet ?? "",
            kitchenNotes: k?.kitchenmealnotes ?? "",
            src: data.source,
        };
    }
    const i = seed();

    // Re-booking arrives here with the stay it came from: same party, same
    // room, next season's dates. All of it is editable, and the stay it came
    // from is not touched — this saves a new reservation like any other.
    const src = i.src;

    // Guest fields
    let attachedGuestId = $state<number | null>(i.attachedGuestId);
    let salutation = $state(i.salutation);
    let firstName = $state(i.firstName);
    let lastName = $state(i.lastName);
    let address = $state(i.address);
    let city = $state(i.city);
    let region = $state(i.region);
    let country = $state(i.country);
    let postal = $state(i.postal);
    let phone = $state(i.phone);
    let email = $state(i.email);

    // Guest lookup — the same partial-name search as the lookup screen.
    let guestQuery = $state("");
    let attaching = $state(false);

    async function attachSearchRow(g: GuestSearchRow) {
        attaching = true;
        try {
            // The search row carries only enough to recognise a guest. The
            // full record has the street address and the rest of the mailing
            // details the confirmation prints, so pull it before filling in.
            const [full, meal] = await Promise.all([
                getGuest(g.guestid),
                guestKitchenMeal(g.guestid),
            ]);
            attachedGuestId = g.guestid;
            salutation = full?.guestsalutation ?? "";
            firstName = full?.guestfirstname ?? g.guestfirstname ?? "";
            lastName = full?.guestlastname ?? g.guestlastname;
            address = full?.guestaddress ?? "";
            city = full?.guestcity ?? g.guestcity ?? "";
            region = full?.guestregion ?? g.guestregion ?? "";
            country = full?.guestcountry ?? "CAN";
            postal = full?.guestpczip ?? "";
            phone = full?.guestprimaryphone ?? g.guestprimaryphone ?? "";
            email = full?.guestemailaddress ?? g.guestemailaddress ?? "";
            kitchenMealId = meal?.kitchenmealid ?? null;
            diet = meal?.guestdiet ?? "";
            kitchenNotes = meal?.kitchenmealnotes ?? "";
            guestQuery = "";
        } catch (e) {
            toast.error(
                e instanceof Error
                    ? e.message
                    : "Could not load that guest record.",
            );
        } finally {
            attaching = false;
        }
    }

    function clearGuest() {
        attachedGuestId = null;
        kitchenMealId = null;
        diet = kitchenNotes = "";
        salutation =
            firstName =
            lastName =
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
    let arrival = $state(src?.arrival ?? "");
    let departure = $state(src?.departure ?? "");
    let adults = $state(src?.numadults ?? 2);
    let children = $state(src?.numchildren ?? 0);
    let bedType = $state(src?.bedtype ?? "Double");
    let arrivalTime = $state("");
    let groupName = $state(src?.groupname ?? "");

    // Booked-by initials (ypl.reservations.resbookedby), defaulted from the
    // signed-in staff account and editable before saving.
    const BOOKED_BY_DEFAULT = "FD";
    let bookedBy = $state(BOOKED_BY_DEFAULT);
    supabase.auth.getUser().then(({ data }) => {
        const email = data.user?.email;
        // The account resolves after the screen is usable, so initials typed
        // in the meantime are not overwritten.
        if (email && bookedBy === BOOKED_BY_DEFAULT)
            bookedBy = email.slice(0, 2).toUpperCase();
    });

    // Room
    const rooms = roomOptions();
    let roomId = $state(
        src?.roomid ? String(src.roomid) : (rooms[0]?.value ?? ""),
    );
    const salutationOptions = textOptions(SALUTATIONS);
    const bedTypes = bedTypeOptions();
    const dietOptions = textOptions(GUEST_DIETS);

    // Charges and the deposit taken while booking. Held until the reservation
    // exists, then posted to it.
    let pending = $state<PendingLine[]>([]);

    // Housekeeping and diet notes are usually given while the booking is made,
    // so they are captured here and feed the same reports as later edits.
    // Diet is held against the guest, not the stay, so an attached guest shows
    // what the kitchen already has and saving revises that record rather than
    // adding a second one beside it.
    let kitchenMealId = $state<number | null>(i.kitchenMealId);
    let diet = $state(i.diet);
    let kitchenNotes = $state(i.kitchenNotes);
    let housekeepingNotes = $state("");

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
                // The stay this one was re-booked from, so the pair can be
                // read back from either end.
                notes: src ? `Re-booked from #${src.resnumber}` : null,
            });
            // Everything below happens after the reservation exists. If any
            // of it fails the booking still stands, so report what did not
            // land and take the clerk to the reservation to finish there.
            const problems: string[] = [];
            if (pending.length) {
                try {
                    await postPendingLines(
                        created.reservationguestid,
                        pending,
                        data.today,
                    );
                } catch (e) {
                    problems.push(
                        e instanceof Error
                            ? e.message
                            : "the charges and deposit did not post",
                    );
                }
            }
            if (diet || kitchenNotes.trim()) {
                try {
                    await saveKitchenMeal(
                        guestid,
                        diet,
                        kitchenNotes.trim() || null,
                        kitchenMealId,
                    );
                } catch (e) {
                    problems.push(
                        e instanceof Error
                            ? e.message
                            : "the diet notes did not save",
                    );
                }
            }
            if (housekeepingNotes.trim()) {
                try {
                    await addHousekeepingNote(
                        created.reservationguestid,
                        housekeepingNotes.trim(),
                        data.today,
                    );
                } catch (e) {
                    problems.push(
                        e instanceof Error
                            ? e.message
                            : "the housekeeping notes did not save",
                    );
                }
            }

            const stay = `${lastName}${firstName ? ", " + firstName : ""} · ${dateMed(arrival)} → ${dateMed(departure)}`;
            if (problems.length) {
                toast.error(
                    `Reservation #${created.resnumber} created, but: ${problems.join("; ")}`,
                );
            } else {
                toast.success(`Reservation #${created.resnumber} created`, {
                    description: stay,
                });
            }
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
    <div class="text-center">
        <h1 class="text-lg font-semibold">New reservation</h1>
        {#if src}
            <p class="text-muted-foreground text-xs">
                Re-booked from #{src.resnumber}.
            </p>
        {/if}
    </div>
    <Button onclick={save} disabled={!canSave}
        ><SaveIcon /> Save reservation</Button
    >
</div>

<div class="grid items-start gap-5 lg:grid-cols-2">
    <div class="space-y-5">
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
                        <span
                            data-testid="attached-guest"
                            class="flex items-center gap-2 text-sm font-medium"
                        >
                            <UserCheckIcon class="text-primary size-4" /> Existing guest
                            #{attachedGuestId}
                        </span>
                        <Button variant="ghost" size="sm" onclick={clearGuest}
                            ><XIcon /> Use a new guest</Button
                        >
                    </div>
                {:else}
                    <div class="space-y-1.5">
                        <Label for="guest-q" class="sr-only"
                            >Find an existing guest</Label
                        >
                        <GuestSearch
                            id="guest-q"
                            float
                            bind:query={guestQuery}
                            disabled={attaching}
                            placeholder="Find an existing guest by name…"
                            onselect={attachSearchRow}
                        />
                    </div>
                {/if}

                <div class="grid grid-cols-[90px_1fr] gap-3">
                    <div class="space-y-1.5">
                        <Label for="slt">Title</Label>
                        <Combobox
                            id="slt"
                            bind:value={salutation}
                            options={salutationOptions}
                            placeholder="—"
                        />
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
                        <Label for="ph">Phone</Label><PhoneInput
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

        <!-- Housekeeping and diet, usually given while booking -->
        <Card.Root>
            <Card.Header class="border-b pb-4">
                <Card.Title class="text-base">Housekeeping & diet</Card.Title>
                <Card.Description>
                    Prints on the housekeeping and kitchen reports.
                </Card.Description>
            </Card.Header>
            <Card.Content class="space-y-4">
                <div class="space-y-1.5">
                    <Label for="diet">Diet</Label>
                    <Combobox
                        id="diet"
                        bind:value={diet}
                        options={dietOptions}
                        placeholder="None"
                    />
                </div>
                <div class="space-y-1.5">
                    <Label for="kitchen-notes">Diet & allergy notes</Label>
                    <Textarea
                        id="kitchen-notes"
                        bind:value={kitchenNotes}
                        rows={3}
                        placeholder="Allergies, meal preferences"
                    />
                </div>
                <div class="space-y-1.5">
                    <Label for="hk-notes">Housekeeping notes</Label>
                    <Textarea
                        id="hk-notes"
                        bind:value={housekeepingNotes}
                        rows={3}
                        placeholder="Bed setup, room readiness"
                    />
                </div>
            </Card.Content>
        </Card.Root>
    </div>

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
                        <Label for="bed">Beds</Label>
                        <Combobox
                            id="bed"
                            bind:value={bedType}
                            options={bedTypes}
                        />
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
                    <Label for="room">Room</Label>
                    <Combobox
                        id="room"
                        bind:value={roomId}
                        options={rooms}
                        searchPlaceholder="Room name or number…"
                    />
                    <p class="text-muted-foreground text-xs">
                        Room moves can be added later from the reservation.
                    </p>
                </div>
            </Card.Content>
        </Card.Root>

        <!-- Items to be charged and the deposit taken now -->
        <Card.Root>
            <Card.Header class="border-b pb-4">
                <Card.Title class="text-base">Charges & deposit</Card.Title>
                <Card.Description>
                    Posted when the reservation is saved.
                </Card.Description>
            </Card.Header>
            <Card.Content>
                <ChargeBasket bind:lines={pending} />
            </Card.Content>
        </Card.Root>
    </div>
</div>
