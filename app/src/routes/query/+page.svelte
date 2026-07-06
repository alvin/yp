<script lang="ts">
    import { goto } from "$app/navigation";
    import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
    import FilterIcon from "@lucide/svelte/icons/sliders-horizontal";
    import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";

    let { data } = $props();
    let q = $state(initialQ());
    function initialQ() {
        return data.q;
    }

    function refine() {
        if (q.trim()) goto(`/query?q=${encodeURIComponent(q.trim())}`);
    }

    function open(row: (typeof data.rows)[number]) {
        if (row.resnumber) goto(`/reservations/${row.resnumber}`);
        else if (row.guestid) goto(`/guests/${row.guestid}`);
    }
</script>

<svelte:head><title>Search all fields · “{data.q}”</title></svelte:head>

<div class="mb-4">
    <Button variant="ghost" size="sm" href="/"><ArrowLeftIcon /> Lookup</Button>
</div>

<div class="mx-auto max-w-2xl">
    <h1 class="mb-1 text-lg font-semibold">Search all fields</h1>
    <p class="text-muted-foreground mb-4 text-sm">
        Matches phone, address, email, and reservation number across all
        records.
    </p>

    <div class="mb-5 flex gap-2">
        <div class="relative flex-1">
            <FilterIcon
                class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            />
            <Input
                bind:value={q}
                onkeydown={(e) => e.key === "Enter" && refine()}
                placeholder="Phone, address, email, or reservation #"
                class="h-11 pl-9"
            />
        </div>
        <Button class="h-11" onclick={refine}>Search</Button>
    </div>

    {#if data.rows.length}
        <div class="overflow-hidden rounded-xl border bg-card shadow-sm">
            {#each data.rows as row, i (i)}
                <button
                    type="button"
                    onclick={() => open(row)}
                    class="hover:bg-accent/60 flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-0"
                >
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                            <span class="truncate font-medium"
                                >{row.guest_name}</span
                            >
                            {#if row.resnumber}<span
                                    class="text-muted-foreground text-xs tabular-nums"
                                    >#{row.resnumber}</span
                                >{/if}
                        </div>
                        <div
                            class="text-muted-foreground mt-0.5 truncate text-xs"
                        >
                            {row.detail}
                        </div>
                    </div>
                    <Badge variant="secondary" class="capitalize"
                        >{row.matched_on}</Badge
                    >
                    <ChevronRightIcon
                        class="text-muted-foreground size-4 shrink-0"
                    />
                </button>
            {/each}
        </div>
    {:else if data.q}
        <p
            class="text-muted-foreground rounded-xl border border-dashed bg-card px-4 py-12 text-center text-sm"
        >
            No records match “{data.q}”.
        </p>
    {/if}
</div>
