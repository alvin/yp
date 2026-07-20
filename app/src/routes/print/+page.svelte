<script lang="ts">
    import { goto } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
    import PrinterIcon from "@lucide/svelte/icons/printer";
    import FileTextIcon from "@lucide/svelte/icons/file-text";
    import ClipboardListIcon from "@lucide/svelte/icons/clipboard-list";
    import CalculatorIcon from "@lucide/svelte/icons/calculator";
    import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
    import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import {
        findReservation,
        guestHistory,
        reportGuestDocumentQueue,
        searchGuestsByName,
        TODAY,
    } from "$lib/data/queries.js";
    import type {
        GuestDocument,
        GuestDocumentQueueRow,
        GuestHistoryRow,
        GuestSearchRow,
    } from "$lib/data/types.js";
    import { addDays, dateMed } from "$lib/format.js";

    let printDate = $state(TODAY);
    const tomorrow = addDays(TODAY, 1);

    // Optional range end for reports that support one (kitchen filtered).
    let endDate = $state("");

    // Guest document types → report route segment.
    const DOCS: { key: GuestDocument; label: string; route: string }[] = [
        { key: "confirmation", label: "Confirmation", route: "confirmation" },
        {
            key: "check_in_folio",
            label: "Check-in folio",
            route: "check-in-folio",
        },
        {
            key: "checkout_bill",
            label: "Check-out bill",
            route: "checkout-bill",
        },
        {
            key: "cancellation_notice",
            label: "Cancellation",
            route: "cancellation",
        },
    ];

    let queues = $state<Record<GuestDocument, GuestDocumentQueueRow[]>>({
        confirmation: [],
        check_in_folio: [],
        checkout_bill: [],
        cancellation_notice: [],
    });
    $effect(() => {
        const date = printDate;
        let alive = true;
        Promise.all(
            DOCS.map((d) => reportGuestDocumentQueue(d.key, date)),
        ).then((results) => {
            if (!alive) return;
            queues = Object.fromEntries(
                DOCS.map((d, idx) => [d.key, results[idx]]),
            ) as Record<GuestDocument, GuestDocumentQueueRow[]>;
        });
        return () => {
            alive = false;
        };
    });

    // Live batch summary from the queues loaded above (+ the 4 daily reports).
    function n(count: number, word: string): string {
        return count ? `${count} ${word}${count === 1 ? "" : "s"}` : "";
    }
    const batchSummary = $derived(
        [
            "4 daily reports",
            n(queues.confirmation.length, "confirmation"),
            n(queues.check_in_folio.length, "folio"),
            n(queues.checkout_bill.length, "bill"),
        ]
            .filter(Boolean)
            .join(" · "),
    );

    // Individual lookup (open any document by reservation number).
    let individualRes = $state("");
    async function openIndividual(route: string) {
        const n = Number(individualRes);
        if (!n) return;
        if (await findReservation(n)) goto(`/reports/${route}/${n}`);
        else toast.error(`No reservation found for #${individualRes}`);
    }

    // Reprint by guest: find the guest by name, pick one of their stays, and
    // open the selected document type for that reservation.
    let guestQuery = $state("");
    let guestMatches = $state<GuestSearchRow[]>([]);
    let guestStays = $state<GuestHistoryRow[]>([]);
    let guestPicked = $state<string | null>(null);
    $effect(() => {
        const q = guestQuery.trim();
        if (!q) {
            guestMatches = [];
            return;
        }
        let alive = true;
        const timer = setTimeout(async () => {
            const rows = await searchGuestsByName(q);
            if (alive) guestMatches = rows.slice(0, 5);
        }, 150);
        return () => {
            alive = false;
            clearTimeout(timer);
        };
    });
    async function pickGuest(g: GuestSearchRow) {
        guestPicked = g.guest_name;
        guestQuery = "";
        guestMatches = [];
        guestStays = (await guestHistory(g.guestid)).slice(0, 4);
    }
    function openStayDocument(resnumber: number, route: string) {
        goto(`/reports/${route}/${resnumber}`);
    }

    const operationalReports = $derived([
        {
            label: "Housekeeping",
            href: "housekeeping",
            desc: "Rooms to service",
            q: `date=${printDate}`,
        },
        {
            label: "In house",
            href: "in-house",
            desc: "Guests in residence",
            q: `date=${printDate}`,
        },
        {
            label: "Kitchen / dietary",
            href: "kitchen",
            desc: "Allergies & diets",
            q: `date=${printDate}`,
        },
        {
            label: "Kitchen — 7-day range",
            href: "kitchen-filtered",
            desc: "Diets across the week",
            q: endDate
                ? `from=${printDate}&to=${endDate}`
                : `from=${printDate}&to=${addDays(printDate, 6)}`,
        },
        {
            label: "Liquor / charge list",
            href: "manual-sales",
            desc: "Room sales sheet",
            q: `date=${printDate}`,
        },
        {
            label: "Cancellation report",
            href: "cancellation-list",
            desc: "Cancelled on this day",
            q: `date=${printDate}`,
        },
    ]);
</script>

<svelte:head><title>Print Center · Yellow Point Lodge</title></svelte:head>

<div class="mb-4">
    <Button variant="ghost" size="sm" href="/"><ArrowLeftIcon /> Lookup</Button>
</div>

<div class="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div>
        <h1 class="flex items-center gap-2 text-xl font-semibold">
            <PrinterIcon class="size-5" /> Print Center
        </h1>
        <p class="text-muted-foreground mt-1 text-sm">
            Guest documents and operational reports.
        </p>
    </div>
    <div class="space-y-1.5">
        <div class="flex flex-wrap items-end gap-3">
            <div class="space-y-1.5">
                <Label for="print-date">Report date</Label>
                <div class="flex items-center gap-2">
                    <Input
                        id="print-date"
                        type="date"
                        bind:value={printDate}
                        class="h-10 w-44"
                    />
                    <Button
                        variant={printDate === TODAY ? "secondary" : "ghost"}
                        size="sm"
                        onclick={() => (printDate = TODAY)}>Today</Button
                    >
                    <Button
                        variant={printDate === tomorrow ? "secondary" : "ghost"}
                        size="sm"
                        onclick={() => (printDate = tomorrow)}>Tomorrow</Button
                    >
                </div>
            </div>
            <div class="space-y-1.5">
                <Label for="print-end-date"
                    >End date
                    <span class="text-muted-foreground font-normal"
                        >(optional)</span
                    ></Label
                >
                <Input
                    id="print-end-date"
                    type="date"
                    bind:value={endDate}
                    min={printDate}
                    class="h-10 w-44"
                />
            </div>
        </div>
        {#if endDate}
            <p class="text-muted-foreground text-xs">
                Reports that support a range use it; single-day reports use the
                report date.
            </p>
        {/if}
    </div>
</div>

<Card.Root class="border-primary/40 mb-5">
    <Card.Content class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
            <div class="flex items-center gap-2 text-base font-semibold">
                <PrinterIcon class="size-4" /> Batch print for {dateMed(
                    printDate,
                )}
            </div>
            <div class="mt-1.5">
                <span
                    class="bg-primary/10 text-primary inline-block rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums"
                    >{batchSummary}</span
                >
            </div>
        </div>
        <Button href="/print/batch?date={printDate}">
            Review &amp; print <ArrowRightIcon class="size-4" />
        </Button>
    </Card.Content>
</Card.Root>

<div class="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
    <!-- Guest documents -->
    <Card.Root>
        <Card.Header class="border-b pb-4">
            <Card.Title class="flex items-center gap-2 text-base"
                ><FileTextIcon class="size-4" /> Guest documents</Card.Title
            >
            <Card.Description
                >Pick a day's batch, or open one by reservation number.</Card.Description
            >
        </Card.Header>
        <Card.Content class="pt-4">
            <Tabs.Root value="confirmation">
                <Tabs.List class="grid w-full grid-cols-4">
                    {#each DOCS as d (d.key)}
                        <Tabs.Trigger value={d.key} class="text-xs">
                            {d.label}
                            {#if queues[d.key].length}
                                <span
                                    class="bg-primary/15 text-primary ml-1 rounded-full px-1.5 text-[10px] tabular-nums"
                                    >{queues[d.key].length}</span
                                >
                            {/if}
                        </Tabs.Trigger>
                    {/each}
                </Tabs.List>

                {#each DOCS as d (d.key)}
                    <Tabs.Content value={d.key} class="mt-4 space-y-3">
                        {#if queues[d.key].length}
                            <div class="overflow-hidden rounded-lg border">
                                {#each queues[d.key] as row (row.reservationid)}
                                    <a
                                        href="/reports/{d.route}/{row.resnumber}"
                                        class="hover:bg-accent/60 flex items-center gap-3 border-b px-4 py-2.5 transition-colors last:border-0"
                                    >
                                        <div class="min-w-0 flex-1">
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <span class="font-medium"
                                                    >{row.guest}</span
                                                >
                                                <span
                                                    class="text-muted-foreground text-xs tabular-nums"
                                                    >#{row.resnumber}</span
                                                >
                                            </div>
                                            <div
                                                class="text-muted-foreground text-xs"
                                            >
                                                {row.reason}
                                            </div>
                                        </div>
                                        <ChevronRightIcon
                                            class="text-muted-foreground size-4 shrink-0"
                                        />
                                    </a>
                                {/each}
                            </div>
                        {:else}
                            <p
                                class="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm"
                            >
                                No {d.label.toLowerCase()} documents for {dateMed(
                                    printDate,
                                )}.
                            </p>
                        {/if}

                        <div class="flex items-end gap-2 border-t pt-3">
                            <div class="flex-1 space-y-1.5">
                                <Label for="ind-{d.key}" class="text-xs"
                                    >Open by reservation #</Label
                                >
                                <Input
                                    id="ind-{d.key}"
                                    bind:value={individualRes}
                                    onkeydown={(e) =>
                                        e.key === "Enter" &&
                                        openIndividual(d.route)}
                                    inputmode="numeric"
                                    placeholder="e.g. 108231"
                                    class="h-9"
                                />
                            </div>
                            <Button
                                class="h-9"
                                variant="outline"
                                onclick={() => openIndividual(d.route)}
                            >
                                Open <ArrowRightIcon class="size-3.5" />
                            </Button>
                        </div>

                        <div class="space-y-1.5 pt-1">
                            <Label for="guest-doc-q" class="text-xs"
                                >…or reprint by guest</Label
                            >
                            <Input
                                id="guest-doc-q"
                                bind:value={guestQuery}
                                placeholder="Find a guest by name…"
                                autocomplete="off"
                                class="h-9"
                            />
                            {#if guestMatches.length}
                                <div class="overflow-hidden rounded-lg border">
                                    {#each guestMatches as g (g.guestid)}
                                        <button
                                            type="button"
                                            class="hover:bg-accent flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-0"
                                            onclick={() => pickGuest(g)}
                                        >
                                            <span>{g.guest_name}</span>
                                            <span
                                                class="text-muted-foreground text-xs"
                                                >{[g.guestcity, g.guestregion]
                                                    .filter(Boolean)
                                                    .join(", ")}</span
                                            >
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                            {#if guestPicked && guestStays.length}
                                <p class="text-muted-foreground text-xs">
                                    {guestPicked} — pick the stay to reprint its
                                    {d.label.toLowerCase()}:
                                </p>
                                <div class="overflow-hidden rounded-lg border">
                                    {#each guestStays as s (s.reservationid)}
                                        <button
                                            type="button"
                                            class="hover:bg-accent flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-0"
                                            onclick={() =>
                                                openStayDocument(
                                                    s.resnumber,
                                                    d.route,
                                                )}
                                        >
                                            <span class="tabular-nums"
                                                >#{s.resnumber}</span
                                            >
                                            <span
                                                class="text-muted-foreground text-xs"
                                            >
                                                {dateMed(s.arrival_date)} → {dateMed(
                                                    s.departure_date,
                                                )}{#if s.rescancelled}
                                                    · cancelled{/if}
                                            </span>
                                        </button>
                                    {/each}
                                </div>
                            {:else if guestPicked}
                                <p class="text-muted-foreground text-xs">
                                    {guestPicked} has no stays on record.
                                </p>
                            {/if}
                        </div>
                    </Tabs.Content>
                {/each}
            </Tabs.Root>
        </Card.Content>
    </Card.Root>

    <div class="space-y-5">
        <!-- Operational reports -->
        <Card.Root>
            <Card.Header class="border-b pb-4">
                <Card.Title class="flex items-center gap-2 text-base"
                    ><ClipboardListIcon class="size-4" /> Operational reports</Card.Title
                >
                <Card.Description>For {dateMed(printDate)}</Card.Description>
            </Card.Header>
            <Card.Content class="grid gap-2 pt-4">
                {#each operationalReports as r (r.href)}
                    <a
                        href="/reports/{r.href}?{r.q}"
                        class="hover:border-primary/40 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
                    >
                        <span>
                            <span class="block text-sm font-medium"
                                >{r.label}</span
                            >
                            <span class="text-muted-foreground block text-xs"
                                >{r.desc}</span
                            >
                        </span>
                        <ChevronRightIcon
                            class="text-muted-foreground size-4 shrink-0"
                        />
                    </a>
                {/each}
            </Card.Content>
        </Card.Root>

        <!-- Daily cash -->
        <Card.Root>
            <Card.Header class="border-b pb-4">
                <Card.Title class="flex items-center gap-2 text-base"
                    ><CalculatorIcon class="size-4" /> Daily cash</Card.Title
                >
            </Card.Header>
            <Card.Content class="pt-4">
                <a
                    href="/reports/dcar?date={printDate}"
                    class="hover:border-primary/40 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
                >
                    <span>
                        <span class="block text-sm font-medium"
                            >Daily Cash Activity Report</span
                        >
                        <span class="text-muted-foreground block text-xs"
                            >Two-section balance with appendices</span
                        >
                    </span>
                    <ChevronRightIcon
                        class="text-muted-foreground size-4 shrink-0"
                    />
                </a>
            </Card.Content>
        </Card.Root>
    </div>
</div>
