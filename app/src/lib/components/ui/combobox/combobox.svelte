<script lang="ts">
    // The lodge's dropdown. Looks and behaves like a plain select — a button
    // showing what is chosen — but the list that opens can be narrowed by
    // typing any part of an entry, which is what makes the long lists (rooms,
    // priced items) workable.
    //
    // With `multiple`, the same dropdown ticks several entries: each has a tick
    // box, the list stays open while they are ticked, Select all and Clear act
    // on what is listed (the matches, once something is typed), and the button
    // sums up what is chosen.
    import { Command, Popover } from "bits-ui";
    import CheckIcon from "@lucide/svelte/icons/check";
    import MinusIcon from "@lucide/svelte/icons/minus";
    import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
    import SearchIcon from "@lucide/svelte/icons/search";
    import { cn } from "$lib/utils.js";
    import { filterOptions, type ComboboxOption } from "./filter.js";

    let {
        value = $bindable(""),
        values = $bindable([]),
        multiple = false,
        mixed = [],
        summary,
        ontoggle,
        options,
        placeholder = "Select…",
        searchPlaceholder = "Search…",
        id,
        disabled = false,
        class: className,
        onchange,
    }: {
        value?: string;
        /** The entries ticked, with `multiple`. */
        values?: string[];
        multiple?: boolean;
        /** Entries shown as partly chosen, with `multiple`. */
        mixed?: string[];
        /** What the button reads once something is ticked or partly chosen, with `multiple`. */
        summary?: (chosen: ComboboxOption[], mixed: ComboboxOption[]) => string;
        /** Ticking or clearing entries, with `multiple`, in place of changing `values`. */
        ontoggle?: (values: string[], on: boolean) => void;
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
    const chosen = $derived(
        multiple ? options.filter((o) => values.includes(o.value)) : [],
    );
    const shown = $derived(filterOptions(options, search));
    const partly = $derived(
        multiple ? options.filter((o) => mixed.includes(o.value)) : [],
    );
    const buttonText = $derived(
        multiple
            ? chosen.length || partly.length
                ? (summary?.(chosen, partly) ?? `${chosen.length} chosen`)
                : null
            : (selected?.label ?? null),
    );

    function tick(changed: string[], on: boolean) {
        if (!changed.length) return;
        if (ontoggle) ontoggle(changed, on);
        else
            values = on
                ? [...values, ...changed.filter((v) => !values.includes(v))]
                : values.filter((v) => !changed.includes(v));
    }

    // Select all and Clear act on the entries listed: all of them, or the
    // matches for what has been typed.
    const searching = $derived(search.trim() !== "");
    const canSelect = $derived(shown.some((o) => !values.includes(o.value)));
    const canClear = $derived(
        shown.some((o) => values.includes(o.value) || mixed.includes(o.value)),
    );

    function choose(option: ComboboxOption) {
        if (multiple) {
            tick([option.value], !values.includes(option.value));
            return;
        }
        value = option.value;
        onchange?.(option.value);
        open = false;
    }

    const isChosen = (option: ComboboxOption) =>
        multiple ? values.includes(option.value) : option.value === value;

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
        <span class={cn("truncate", !buttonText && "text-muted-foreground")}>
            {buttonText ?? placeholder}
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
                {#if multiple}
                    <div
                        class="flex items-center justify-between gap-2 border-b px-2 py-1"
                    >
                        <button
                            type="button"
                            data-action="select-all"
                            class="text-primary rounded px-1.5 py-1 text-xs font-medium hover:underline disabled:text-muted-foreground disabled:no-underline"
                            disabled={!canSelect}
                            onclick={() =>
                                tick(
                                    shown
                                        .filter((o) => !values.includes(o.value))
                                        .map((o) => o.value),
                                    true,
                                )}
                            >{searching ? "Select all results" : "Select all"}</button
                        >
                        <button
                            type="button"
                            data-action="clear"
                            class="text-primary rounded px-1.5 py-1 text-xs font-medium hover:underline disabled:text-muted-foreground disabled:no-underline"
                            disabled={!canClear}
                            onclick={() =>
                                tick(
                                    shown
                                        .filter(
                                            (o) =>
                                                values.includes(o.value) ||
                                                mixed.includes(o.value),
                                        )
                                        .map((o) => o.value),
                                    false,
                                )}
                            >{searching ? "Clear results" : "Clear"}</button
                        >
                    </div>
                {/if}
                <Command.List
                    data-testid="combobox-list"
                    class="max-h-60 overflow-y-auto p-1"
                >
                    {#each shown as option, i (option.value)}
                        {#if option.group && option.group !== shown[i - 1]?.group}
                            <div
                                class="text-muted-foreground px-2 pt-2 pb-1 text-[11px] font-medium tracking-wide uppercase"
                            >
                                {option.group}
                            </div>
                        {/if}
                        <Command.Item
                            value={option.value}
                            onSelect={() => choose(option)}
                            data-option={option.value}
                            data-ticked={multiple
                                ? isChosen(option)
                                    ? "true"
                                    : mixed.includes(option.value)
                                      ? "mixed"
                                      : "false"
                                : undefined}
                            class={cn(
                                "data-selected:bg-accent data-selected:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pl-2 text-sm outline-hidden select-none",
                                multiple ? "pr-2" : "pr-8",
                            )}
                        >
                            {#if multiple}
                                <span
                                    aria-hidden="true"
                                    class={cn(
                                        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                                        isChosen(option)
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : mixed.includes(option.value)
                                              ? "border-primary text-primary"
                                              : "border-input bg-field",
                                    )}
                                >
                                    {#if isChosen(option)}
                                        <CheckIcon class="size-3" />
                                    {:else if mixed.includes(option.value)}
                                        <MinusIcon class="size-3" />
                                    {/if}
                                </span>
                            {/if}
                            <span class="min-w-0 flex-1 truncate"
                                >{option.label}</span
                            >
                            {#if option.hint}
                                <span
                                    class="text-muted-foreground shrink-0 text-xs tabular-nums"
                                    >{option.hint}</span
                                >
                            {/if}
                            {#if !multiple && isChosen(option)}
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
