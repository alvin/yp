<script lang="ts">
    // One guest lookup, used everywhere a guest is searched for: the lookup
    // home screen, the new-reservation guest panel, the add-a-name dialog and
    // the Print Center. Partial strings match any part of a name, the list
    // scrolls, and names sharing a stay with a match are shown too — a booking
    // held under two partners is found from either name.
    import type { Snippet } from "svelte";
    import SearchIcon from "@lucide/svelte/icons/search";
    import UsersIcon from "@lucide/svelte/icons/users";

    import { Input } from "$lib/components/ui/input/index.js";
    import { searchGuestsByName } from "$lib/data/queries.js";
    import type { GuestSearchRow } from "$lib/data/types.js";

    let {
        id,
        placeholder = "Start typing a name…",
        onselect,
        float = false,
        disabled = false,
        query = $bindable(""),
        emptyAction,
    }: {
        id: string;
        placeholder?: string;
        onselect: (guest: GuestSearchRow) => void;
        /** Overlay the results instead of pushing the form down. */
        float?: boolean;
        disabled?: boolean;
        query?: string;
        /** Follows "No matching guests." — somewhere to go instead. */
        emptyAction?: Snippet;
    } = $props();

    let matches = $state<GuestSearchRow[]>([]);
    let searching = $state(false);

    $effect(() => {
        const q = query.trim();
        if (!q) {
            matches = [];
            searching = false;
            return;
        }
        let alive = true;
        searching = true;
        const timer = setTimeout(async () => {
            try {
                const rows = await searchGuestsByName(q);
                if (alive) matches = rows;
            } finally {
                if (alive) searching = false;
            }
        }, 150);
        return () => {
            alive = false;
            clearTimeout(timer);
        };
    });

    function pick(g: GuestSearchRow) {
        onselect(g);
    }

    function onkeydown(e: KeyboardEvent) {
        if (e.key === "Enter" && matches.length) pick(matches[0]);
    }

    function where(g: GuestSearchRow): string {
        return [g.guestcity, g.guestregion].filter(Boolean).join(", ");
    }
</script>

<div class="relative">
    <div class="relative">
        <SearchIcon
            class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
        />
        <Input
            {id}
            {disabled}
            bind:value={query}
            {onkeydown}
            {placeholder}
            class="pl-9"
            autocomplete="off"
        />
    </div>

    {#if query.trim()}
        <div
            data-testid="guest-matches"
            class="max-h-80 overflow-y-auto rounded-lg border {float
                ? 'bg-popover absolute z-20 mt-1 w-full shadow-md'
                : 'bg-card mt-2'}"
        >
            {#each matches as g (g.guestid)}
                <button
                    type="button"
                    onclick={() => pick(g)}
                    class="hover:bg-accent flex w-full items-start justify-between gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-0"
                >
                    <span class="min-w-0">
                        <span class="block truncate text-sm font-medium"
                            >{g.guest_name}</span
                        >
                        <span
                            class="text-muted-foreground block truncate text-xs"
                        >
                            {where(g)}{#if g.guestprimaryphone}{where(g)
                                    ? " · "
                                    : ""}{g.guestprimaryphone}{/if}
                        </span>
                        {#if g.other_names}
                            <span
                                class="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-xs"
                            >
                                <UsersIcon class="size-3 shrink-0" />
                                with {g.other_names}
                            </span>
                        {/if}
                    </span>
                </button>
            {:else}
                <p class="text-muted-foreground px-3 py-6 text-center text-sm">
                    {#if searching}Searching…{:else}
                        No matching guests.{#if emptyAction}{" "}{@render
                                emptyAction()}{/if}
                    {/if}
                </p>
            {/each}
        </div>
    {/if}
</div>
