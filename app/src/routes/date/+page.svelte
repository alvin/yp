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
    import SharedRoomBadge from "$lib/components/app/shared-room-badge.svelte";
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

    // A list that mixes arrivals, in-house stays and departures reads in the
    // order the day runs, each kind under its own heading, rather than as one
    // run of rows with a status against each. Section names are the ones the
    // mode buttons above already use.
    const SECTIONS: { match: string; label: string }[] = [
        { match: "arrival", label: "Arrivals" },
        { match: "in_house", label: "In house" },
        { match: "occupancy", label: "In house" },
        { match: "overlap", label: "Overlapping" },
        { match: "date_match", label: "Match" },
        { match: "departure", label: "Departures" },
    ];
    const sections = $derived(
        SECTIONS.map((s) => ({
            ...s,
            rows: data.rows.filter((r) => r.match === s.match),
        })).filter((s) => s.rows.length),
    );
    // One kind of match needs no headings — the heading above the list says it.
    const grouped = $derived(sections.length > 1);
</script>


<svelte:head>
    <title>Date search · {heading}</title>
    {@html `<style>@page { size: letter landscape; margin: 0.4in; }</style>`}
</svelte:head>

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
                    ? 'bg-field shadow-sm'
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
    {#each sections as section (section.match)}
        {#if grouped}
            <h2 class="section-heading">{section.label}</h2>
        {/if}
        <div class="date-list overflow-hidden rounded-xl border bg-card shadow-sm">
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
                        {#if !grouped}
                            <Table.Head>Match</Table.Head>
                        {/if}
                        <Table.Head class="no-print w-8"></Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#each section.rows as r (r.reservationid)}
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
                            <Table.Cell class="text-muted-foreground">
                                {r.room ?? "—"}
                                {#if r.shared_room}<SharedRoomBadge />{/if}
                            </Table.Cell>
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
                                        <span
                                            class="text-muted-foreground text-xs"
                                            >Awaiting</span
                                        >
                                    {/if}
                                </Table.Cell>
                            {/if}
                            {#if !grouped}
                                <Table.Cell
                                    ><StatusBadge status={r.match} /></Table.Cell
                                >
                            {/if}
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
    {/each}
{:else}
    <p
        class="text-muted-foreground rounded-xl border border-dashed bg-card px-4 py-12 text-center text-sm"
    >
        No reservations match this date. Try a different date or mode.
    </p>
{/if}

<style>
	.section-heading {
		margin: 20px 0 8px;
		font-size: 0.95rem;
		font-weight: 600;
	}
	.section-heading:first-of-type {
		margin-top: 0;
	}

	/* On paper the list is the whole point of the screen: nothing may be
	   clipped by the card it sits in, and long guest names and multi-room
	   stays wrap instead of pushing the right-hand columns off the sheet. */
	@media print {
		.section-heading {
			margin: 14px 0 4px;
			font-size: 11pt;
			break-after: avoid;
		}
		.date-list {
			overflow: visible !important;
			border: 0;
			border-radius: 0;
			box-shadow: none;
			break-inside: auto;
		}
		.date-list :global([data-slot='table-container']) {
			overflow: visible !important;
		}
		.date-list :global(table) {
			/* Auto layout with wrapping allowed: the columns take the width
			   their content needs and the sheet still holds them all, whether
			   or not the Match column is present. */
			width: 100%;
			table-layout: auto;
			font-size: 8.5pt;
		}
		.date-list :global(th),
		.date-list :global(td) {
			white-space: normal;
			overflow-wrap: anywhere;
			padding: 2px 4px;
			vertical-align: top;
		}
		.date-list :global(thead) {
			display: table-header-group;
		}
		.date-list :global(tr) {
			break-inside: avoid;
		}
		/* Browsers drop background colours on paper by default, so the shared
		   mark carries its own outline rather than printing as faint text. */
		.date-list :global([data-slot='badge']) {
			border: 1px solid currentColor;
			color: #000;
			padding: 0 3px;
		}
	}
</style>
