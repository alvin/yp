<script lang="ts">
    // The lodge's dropdown. Looks and behaves like a plain select — a button
    // showing what is chosen — but the list that opens can be narrowed by
    // typing any part of an entry, which is what makes the long lists (rooms,
    // priced items) workable.
    import { Command, Popover } from "bits-ui";
    import CheckIcon from "@lucide/svelte/icons/check";
    import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
    import SearchIcon from "@lucide/svelte/icons/search";
    import { cn } from "$lib/utils.js";
    import { filterOptions, type ComboboxOption } from "./filter.js";

    let {
        value = $bindable(""),
        options,
        placeholder = "Select…",
        searchPlaceholder = "Search…",
        id,
        disabled = false,
        class: className,
        onchange,
    }: {
        value?: string;
        options: ComboboxOption[];
        placeholder?: string;
        searchPlaceholder?: string;
        id?: string;
        disabled?: boolean;
        class?: string;
        onchange?: (value: string) => void;
    } = $props();

    let open = $state(false);
    let search = $state("");

    const selected = $derived(options.find((o) => o.value === value));
    const shown = $derived(filterOptions(options, search));

    function choose(option: ComboboxOption) {
        value = option.value;
        onchange?.(option.value);
        open = false;
    }

    $effect(() => {
        if (!open) search = "";
    });
</script>

<Popover.Root bind:open>
    <Popover.Trigger
        {id}
        {disabled}
        data-slot="combobox-trigger"
        class={cn(
            "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-field px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            className,
        )}
    >
        <span class={cn("truncate", !selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder}
        </span>
        <ChevronDownIcon class="size-4 shrink-0 opacity-50" />
    </Popover.Trigger>

    <Popover.Portal>
        <Popover.Content
            sideOffset={4}
            data-slot="combobox-content"
            class="bg-popover text-popover-foreground z-50 w-(--bits-floating-anchor-width) min-w-[14rem] overflow-hidden rounded-md border p-0 shadow-md"
        >
            <Command.Root shouldFilter={false} loop>
                <div class="flex items-center gap-2 border-b px-3">
                    <SearchIcon class="size-4 shrink-0 opacity-50" />
                    <Command.Input
                        bind:value={search}
                        placeholder={searchPlaceholder}
                        class="placeholder:text-muted-foreground h-9 w-full bg-transparent text-sm outline-hidden"
                    />
                </div>
                <Command.List
                    data-testid="combobox-list"
                    class="max-h-60 overflow-y-auto p-1"
                >
                    {#each shown as option (option.value)}
                        <Command.Item
                            value={option.value}
                            onSelect={() => choose(option)}
                            data-option={option.value}
                            class="data-selected:bg-accent data-selected:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none"
                        >
                            <span class="min-w-0 flex-1 truncate"
                                >{option.label}</span
                            >
                            {#if option.hint}
                                <span
                                    class="text-muted-foreground shrink-0 text-xs tabular-nums"
                                    >{option.hint}</span
                                >
                            {/if}
                            {#if option.value === value}
                                <CheckIcon class="absolute right-2 size-4" />
                            {/if}
                        </Command.Item>
                    {:else}
                        <div
                            class="text-muted-foreground px-2 py-6 text-center text-sm"
                        >
                            No matches.
                        </div>
                    {/each}
                </Command.List>
            </Command.Root>
        </Popover.Content>
    </Popover.Portal>
</Popover.Root>
