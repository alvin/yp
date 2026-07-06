<script lang="ts">
    import { goto } from "$app/navigation";
    import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
    import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
    import CalendarSearchIcon from "@lucide/svelte/icons/calendar-search";
    import PrinterIcon from "@lucide/svelte/icons/printer";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Table from "$lib/components/ui/table/index.js";
    import StatusBadge from "$lib/components/app/status-badge.svelte";
    import { dateMed, money } from "$lib/format.js";
    import type { DateMode } from "$lib/data/types.js";

    let { data } = $props();

    function seed() {
        const d = data;
        return {
            date: d.kind === "single" ? d.date : d.from,
            endDate: d.kind === "range" ? d.to : "",
            useRange: d.kind === "range",
            mode: d.mode as DateMode,
        };
    }
    const i = seed();

    const MODES: { value: DateMode; label: string }[] = [
        { value: "arrivals", label: "Arrivals" },
        { value: "departures", label: "Departures" },
        { value: "both", label: "Both" },
        { value: "in_house", label: "In house" },
        { value: "occupancy", label: "Occupancy" },
    ];

    let date = $state(i.date);
    let endDate = $state(i.endDate);
    let useRange = $state(i.useRange);
    let mode = $state<DateMode>(i.mode);
    const modeLabel = $derived(
        MODES.find((m) => m.value === mode)?.label ?? "Arrivals",
    );

    function update(nextMode: DateMode = mode) {
        mode = nextMode;
        const params = new URLSearchParams({ mode: nextMode });
        if (useRange && endDate) {
            params.set("from", date);
            params.set("to", endDate);
        } else {
            params.set("date", date);
        }
        goto(`/date?${params.toString()}`);
    }

    const heading = $derived(
        data.kind === "range"
            ? `${dateMed(data.from)} → ${dateMed(data.to)}`
            : dateMed(data.date),
    );

    const showDetail = $derived(data.kind === "single");
</script>

<svelte:head><title>Date search · {heading}</title></svelte:head>

<div class="no-print mb-4">
    <Button variant="ghost" size="sm" href="/"><ArrowLeftIcon /> Lookup</Button>
</div>

<div
    class="no-print mb-5 space-y-3 rounded-xl border bg-card p-4 shadow-sm"
>
    <div class="flex flex-wrap items-end gap-3">
        <div class="space-y-1.5">
            <Label for="d1">{useRange ? "From" : "Date"}</Label>
            <Input id="d1" type="date" bind:value={date} class="h-10" />
        </div>
        {#if useRange}
            <div class="space-y-1.5">
                <Label for="d2">To</Label>
                <Input
                    id="d2"
                    type="date"
                    bind:value={endDate}
                    min={date}
                    class="h-10"
                />
            </div>
        {/if}
        <label
            class="text-muted-foreground mb-2.5 flex cursor-pointer items-center gap-2 text-xs"
        >
            <input
                type="checkbox"
                bind:checked={useRange}
                class="accent-primary size-3.5"
            /> Range
        </label>
        <Button class="ml-auto h-10" onclick={() => update()}
            ><CalendarSearchIcon /> Update</Button
        >
    </div>
    <div
        class="bg-muted inline-flex flex-wrap gap-1 rounded-lg p-1"
        role="tablist"
        aria-label="Match mode"
    >
        {#each MODES as m (m.value)}
            <button
                type="button"
                role="tab"
                aria-selected={mode === m.value}
                class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {mode ===
                m.value
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'}"
                onclick={() => update(m.value)}
            >
                {m.label}
            </button>
        {/each}
    </div>
</div>

<div class="mb-3 flex items-baseline justify-between gap-3">
    <h1 class="text-lg font-semibold">{modeLabel} · {heading}</h1>
    <div class="flex items-center gap-2">
        <span class="text-muted-foreground text-sm"
            >{data.rows.length} result{data.rows.length === 1 ? "" : "s"}</span
        >
        {#if data.rows.length}
            <Button
                variant="outline"
                size="sm"
                class="no-print"
                onclick={() => window.print()}
            >
                <PrinterIcon /> Print list
            </Button>
        {/if}
    </div>
</div>

{#if data.rows.length}
    <div class="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table.Root>
            <Table.Header>
                <Table.Row>
                    <Table.Head>Guest</Table.Head>
                    <Table.Head>Room</Table.Head>
                    <Table.Head>Arrival</Table.Head>
                    <Table.Head>Departure</Table.Head>
                    {#if showDetail}
                        <Table.Head class="text-right">Nights</Table.Head>
                        <Table.Head class="text-right">Pax</Table.Head>
                        <Table.Head class="text-right">Deposit</Table.Head>
                    {/if}
                    <Table.Head>Match</Table.Head>
                    <Table.Head class="no-print w-8"></Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {#each data.rows as r (r.reservationid)}
                    <Table.Row
                        class="cursor-pointer {r.rescancelled
                            ? 'opacity-60'
                            : ''}"
                        onclick={() => goto(`/reservations/${r.resnumber}`)}
                    >
                        <Table.Cell class="font-medium">
                            {r.guest}
                            <span
                                class="text-muted-foreground ml-1 text-xs tabular-nums"
                                >#{r.resnumber}</span
                            >
                            {#if r.rescancelled}
                                <StatusBadge status="cancelled" />
                            {/if}
                        </Table.Cell>
                        <Table.Cell class="text-muted-foreground"
                            >{r.room ?? "—"}</Table.Cell
                        >
                        <Table.Cell class="tabular-nums"
                            >{dateMed(r.arrival)}</Table.Cell
                        >
                        <Table.Cell class="tabular-nums"
                            >{dateMed(r.departure)}</Table.Cell
                        >
                        {#if showDetail}
                            <Table.Cell class="text-right tabular-nums"
                                >{r.nights ?? ""}</Table.Cell
                            >
                            <Table.Cell class="text-right tabular-nums"
                                >{r.pax ?? ""}</Table.Cell
                            >
                            <Table.Cell class="text-right tabular-nums">
                                {#if (r.deposit_cdn ?? 0) > 0}
                                    {money(r.deposit_cdn)}
                                {:else}
                                    <span class="text-muted-foreground text-xs"
                                        >Awaiting</span
                                    >
                                {/if}
                            </Table.Cell>
                        {/if}
                        <Table.Cell><StatusBadge status={r.match} /></Table.Cell
                        >
                        <Table.Cell class="no-print"
                            ><ChevronRightIcon
                                class="text-muted-foreground size-4"
                            /></Table.Cell
                        >
                    </Table.Row>
                {/each}
            </Table.Body>
        </Table.Root>
    </div>
{:else}
    <p
        class="text-muted-foreground rounded-xl border border-dashed bg-card px-4 py-12 text-center text-sm"
    >
        No reservations match this date. Try a different date or mode.
    </p>
{/if}
