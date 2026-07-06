<script lang="ts">
    import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
    import NotebookIcon from "@lucide/svelte/icons/notebook-pen";
    import CalendarPlusIcon from "@lucide/svelte/icons/calendar-plus";
    import MapPinIcon from "@lucide/svelte/icons/map-pin";
    import PhoneIcon from "@lucide/svelte/icons/phone";
    import MailIcon from "@lucide/svelte/icons/mail";
    import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
    import EyeOffIcon from "@lucide/svelte/icons/eye-off";

    import { invalidateAll } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import UsersIcon from "@lucide/svelte/icons/users";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import Money from "$lib/components/app/money.svelte";
    import StatusBadge from "$lib/components/app/status-badge.svelte";
    import { setGuestNotes } from "$lib/data/mutations.js";
    import { dateMed } from "$lib/format.js";
    import type { GuestHistoryRow } from "$lib/data/types.js";

    let { data } = $props();
    const g = $derived(data.guest);

    let notesText = $state("");
    let savingNotes = $state(false);
    function openNotes() {
        notesText = g.guestnotes ?? "";
        notesOpen = true;
    }
    async function saveNotes() {
        savingNotes = true;
        try {
            await setGuestNotes(g.guestid, notesText);
            notesOpen = false;
            toast.success("Guest notes saved (office only — never printed)");
            await invalidateAll();
        } catch (e) {
            toast.error(
                e instanceof Error ? e.message : "Could not save guest notes.",
            );
        } finally {
            savingNotes = false;
        }
    }

    const future = $derived(data.history.filter((h) => h.bucket === "future"));
    const present = $derived(
        data.history.filter((h) => h.bucket === "present"),
    );
    const past = $derived(data.history.filter((h) => h.bucket === "past"));

    let notesOpen = $state(false);

    const SECTIONS: {
        key: string;
        title: string;
        rows: () => GuestHistoryRow[];
        empty: string;
    }[] = [
        {
            key: "present",
            title: "Present reservation (in house)",
            rows: () => present,
            empty: "Not currently in house.",
        },
        {
            key: "future",
            title: "Future reservations",
            rows: () => future,
            empty: "No upcoming reservations.",
        },
        {
            key: "past",
            title: "Past reservations",
            rows: () => past,
            empty: "No past stays on record.",
        },
    ];
</script>

<svelte:head
    ><title>{g.guestlastname}, {g.guestfirstname ?? ""} · Guest</title
    ></svelte:head
>

<div class="mb-4 flex items-center justify-between gap-3">
    <Button variant="ghost" size="sm" href="/"><ArrowLeftIcon /> Lookup</Button>
    <Button variant="outline" size="sm" href="/reservations/new?guest={g.guestid}">
        <CalendarPlusIcon /> Book again
    </Button>
</div>

<div class="grid gap-5 lg:grid-cols-[340px_1fr]">
    <!-- Guest profile -->
    <Card.Root class="h-fit">
        <Card.Header>
            <div class="flex items-start justify-between gap-2">
                <div>
                    <Card.Title class="text-lg"
                        >{g.guestlastname}, {g.guestfirstname ?? ""}</Card.Title
                    >
                    <Card.Description
                        >Guest #{g.guestid}{#if g.guestcompany}
                            · {g.guestcompany}{/if}</Card.Description
                    >
                </div>
                {#if g.guestsalutation}<Badge variant="secondary"
                        >{g.guestsalutation}</Badge
                    >{/if}
            </div>
        </Card.Header>
        <Card.Content class="space-y-4">
            <div class="space-y-2.5 text-sm">
                {#if g.guestaddress || g.guestcity || g.guestregion || g.guestcountry || g.guestpczip}
                    <div class="flex gap-2.5">
                        <MapPinIcon
                            class="text-muted-foreground mt-0.5 size-4 shrink-0"
                        />
                        <span>
                            {#if g.guestaddress}{g.guestaddress}<br />{/if}
                            {#if g.guestcity || g.guestregion || g.guestpczip}
                                {[g.guestcity, g.guestregion, g.guestpczip]
                                    .filter(Boolean)
                                    .join(", ")}<br />
                            {/if}
                            {g.guestcountry ?? ""}
                        </span>
                    </div>
                {/if}
                {#if g.guestprimaryphone}
                    <div class="flex items-center gap-2.5">
                        <PhoneIcon
                            class="text-muted-foreground size-4 shrink-0"
                        />
                        <span
                            >{g.guestprimaryphone}<span
                                class="text-muted-foreground"
                            >
                                · {g.guestprimaryphonetype ?? "Primary"}</span
                            ></span
                        >
                    </div>
                {/if}
                {#if g.guestsecondaryphone}
                    <div class="flex items-center gap-2.5">
                        <PhoneIcon
                            class="text-muted-foreground size-4 shrink-0 opacity-60"
                        />
                        <span
                            >{g.guestsecondaryphone}<span
                                class="text-muted-foreground"
                            >
                                · {g.guestsecondaryphonetype ??
                                    "Secondary"}</span
                            ></span
                        >
                    </div>
                {/if}
                {#if g.guestemailaddress}
                    <div class="flex items-center gap-2.5">
                        <MailIcon
                            class="text-muted-foreground size-4 shrink-0"
                        />
                        <a
                            href="mailto:{g.guestemailaddress}"
                            class="truncate hover:underline"
                            >{g.guestemailaddress}</a
                        >
                    </div>
                {/if}
            </div>

            <Button variant="secondary" class="w-full" onclick={openNotes}>
                <NotebookIcon /> Guest notes
                {#if g.guestnotes}<span
                        class="bg-primary ml-1 size-1.5 rounded-full"
                    ></span>{/if}
            </Button>
        </Card.Content>
    </Card.Root>

    <!-- Reservation history -->
    <div class="space-y-5">
        {#each SECTIONS as section (section.key)}
            {@const rows = section.rows()}
            <section>
                <div class="mb-2 flex items-baseline justify-between">
                    <h2 class="text-sm font-semibold">{section.title}</h2>
                    <span class="text-muted-foreground text-xs"
                        >{rows.length}
                        {rows.length === 1 ? "stay" : "stays"}</span
                    >
                </div>
                {#if rows.length}
                    <div class="overflow-hidden rounded-xl border">
                        {#each rows as r (r.reservationid)}
                            <a
                                href="/reservations/{r.resnumber}"
                                class="hover:bg-accent/60 flex items-center gap-3 border-b px-4 py-3 transition-colors last:border-0"
                            >
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2">
                                        <span class="font-medium tabular-nums"
                                            >#{r.resnumber}</span
                                        >
                                        {#if r.rescancelled}
                                            <StatusBadge status="cancelled" />
                                        {:else}
                                            <StatusBadge status={r.bucket} />
                                        {/if}
                                    </div>
                                    <div
                                        class="text-muted-foreground mt-0.5 truncate text-xs"
                                    >
                                        {dateMed(r.arrival_date)} → {dateMed(
                                            r.departure_date,
                                        )}
                                        {#if r.rooms}· {r.rooms}{/if}
                                    </div>
                                    {#if r.party_size > 1}
                                        <div
                                            class="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-xs"
                                        >
                                            <UsersIcon
                                                class="size-3 shrink-0"
                                            />
                                            Shared with {r.co_guests}
                                        </div>
                                    {/if}
                                </div>
                                <div class="text-right">
                                    <div
                                        class="text-[11px] text-muted-foreground uppercase"
                                    >
                                        Balance
                                    </div>
                                    <Money
                                        value={r.balance_owing}
                                        muteZero
                                        class="text-sm font-medium"
                                    />
                                </div>
                                <ChevronRightIcon
                                    class="text-muted-foreground size-4 shrink-0"
                                />
                            </a>
                        {/each}
                    </div>
                {:else}
                    <p
                        class="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm"
                    >
                        {section.empty}
                    </p>
                {/if}
            </section>
        {/each}
    </div>
</div>

<Dialog.Root bind:open={notesOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2"
                ><NotebookIcon class="size-4" /> Guest notes</Dialog.Title
            >
            <Dialog.Description class="flex items-center gap-1.5">
                <EyeOffIcon class="size-3.5" /> Office only — these never print on
                guest documents or reports.
            </Dialog.Description>
        </Dialog.Header>
        <Textarea
            bind:value={notesText}
            rows={6}
            placeholder="Preferences, history, anything the office should know…"
        />
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (notesOpen = false)}
                >Close</Button
            >
            <Button onclick={saveNotes} disabled={savingNotes}
                >Save notes</Button
            >
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
