<script lang="ts">
    // Charges and the deposit taken while a booking is being made, held until
    // the reservation exists and then posted to it. Used by the new-reservation
    // screen and by re-book.
    import PlusIcon from "@lucide/svelte/icons/plus";
    import TrashIcon from "@lucide/svelte/icons/trash-2";
    import ReceiptIcon from "@lucide/svelte/icons/receipt";
    import CreditCardIcon from "@lucide/svelte/icons/credit-card";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Combobox } from "$lib/components/ui/combobox/index.js";
    import Money from "$lib/components/app/money.svelte";
    import { round2 } from "$lib/charges.js";
    import {
        INV_TYPE_TO_TRANSTYPE,
        inventoryById,
    } from "$lib/data/reference.js";
    import {
        itemOptions,
        paymentCategoryOptions,
        tenderTypeOptions,
    } from "$lib/options.js";
    import {
        pendingLineAmount,
        pendingLineId,
        pendingLineLabel,
        type PendingLine,
    } from "$lib/pending-charges.js";
    let { lines = $bindable([]) }: { lines?: PendingLine[] } = $props();

    let form = $state<"none" | "item" | "payment">("none");

    const items = itemOptions();
    const categories = paymentCategoryOptions();
    const tenders = tenderTypeOptions();

    // --- item line ---
    let itemId = $state("");
    let qty = $state(1);
    let unit = $state(0);

    function onItem(id: string) {
        unit = inventoryById(Number(id))?.invamount ?? 0;
    }

    function addItem() {
        const item = itemId ? inventoryById(Number(itemId)) : undefined;
        if (!item) return;
        lines = [
            ...lines,
            {
                id: pendingLineId(),
                kind: "item",
                inventoryid: item.inventoryid,
                code: item.invcode,
                description: item.invitemdescription ?? item.invtype ?? "Item",
                quantity: Math.max(1, Number(qty) || 1),
                unit: round2(Number(unit) || 0),
                transtype: INV_TYPE_TO_TRANSTYPE[item.invtype] ?? "Misc.",
            },
        ];
        itemId = "";
        qty = 1;
        unit = 0;
        form = "none";
    }

    // --- deposit / prepayment line ---
    let category = $state("Deposit (Received)");
    let tender = $state("Visa");
    let amount = $state(0);

    function addPayment() {
        const value = round2(Number(amount) || 0);
        if (!value) return;
        lines = [
            ...lines,
            {
                id: pendingLineId(),
                kind: "payment",
                category,
                paymenttype: tender,
                amount: value,
            },
        ];
        amount = 0;
        form = "none";
    }

    function remove(id: number) {
        lines = lines.filter((l) => l.id !== id);
    }

    const charged = $derived(
        round2(
            lines
                .filter((l) => l.kind === "item")
                .reduce((s, l) => s + pendingLineAmount(l), 0),
        ),
    );
    const received = $derived(
        round2(
            lines
                .filter((l) => l.kind === "payment")
                .reduce((s, l) => s + pendingLineAmount(l), 0),
        ),
    );
</script>

<div class="space-y-3">
    {#if lines.length}
        <ul class="divide-y rounded-lg border" data-testid="basket-lines">
            {#each lines as l (l.id)}
                <li class="flex items-center gap-3 px-3 py-2 text-sm">
                    {#if l.kind === "item"}
                        <ReceiptIcon
                            class="text-muted-foreground size-4 shrink-0"
                        />
                    {:else}
                        <CreditCardIcon
                            class="text-muted-foreground size-4 shrink-0"
                        />
                    {/if}
                    <span class="min-w-0 flex-1">
                        <span class="block truncate font-medium"
                            >{pendingLineLabel(l)}</span
                        >
                        {#if l.kind === "item"}
                            <span class="text-muted-foreground block text-xs">
                                {l.quantity} × ${l.unit.toFixed(2)}
                            </span>
                        {/if}
                    </span>
                    <Money value={pendingLineAmount(l)} class="tabular-nums" />
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Remove {pendingLineLabel(l)}"
                        onclick={() => remove(l.id)}
                    >
                        <TrashIcon class="size-4" />
                    </Button>
                </li>
            {/each}
        </ul>
        <div class="flex items-center justify-between px-1 text-sm">
            <span class="text-muted-foreground">
                {#if charged}Charges <Money value={charged} />{/if}
                {#if charged && received}·{/if}
                {#if received}Received <Money value={received} />{/if}
            </span>
        </div>
    {/if}

    {#if form === "item"}
        <div class="space-y-3 rounded-lg border p-3">
            <div class="space-y-1.5">
                <Label for="basket-item">Item</Label>
                <Combobox
                    id="basket-item"
                    bind:value={itemId}
                    options={items}
                    placeholder="Choose an item"
                    searchPlaceholder="Item code or name…"
                    onchange={onItem}
                />
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                    <Label for="basket-qty">Qty</Label>
                    <Input
                        id="basket-qty"
                        type="number"
                        min="1"
                        bind:value={qty}
                    />
                </div>
                <div class="space-y-1.5">
                    <Label for="basket-unit">Unit price</Label>
                    <Input
                        id="basket-unit"
                        type="number"
                        step="0.01"
                        min="0"
                        bind:value={unit}
                    />
                </div>
            </div>
            <div class="flex justify-end gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => (form = "none")}>Cancel</Button
                >
                <Button size="sm" disabled={!itemId} onclick={addItem}
                    >Add item</Button
                >
            </div>
        </div>
    {:else if form === "payment"}
        <div class="space-y-3 rounded-lg border p-3">
            <div class="space-y-1.5">
                <Label for="basket-category">Category</Label>
                <Combobox
                    id="basket-category"
                    bind:value={category}
                    options={categories}
                />
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                    <Label for="basket-tender">Tender type</Label>
                    <Combobox
                        id="basket-tender"
                        bind:value={tender}
                        options={tenders}
                    />
                </div>
                <div class="space-y-1.5">
                    <Label for="basket-amount">Amount</Label>
                    <Input
                        id="basket-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        bind:value={amount}
                    />
                </div>
            </div>
            <div class="flex justify-end gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => (form = "none")}>Cancel</Button
                >
                <Button
                    size="sm"
                    disabled={!Number(amount)}
                    onclick={addPayment}>Add {category}</Button
                >
            </div>
        </div>
    {:else}
        <div class="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                id="basket-add-item"
                onclick={() => (form = "item")}
            >
                <PlusIcon /> Charge item
            </Button>
            <Button
                variant="outline"
                size="sm"
                id="basket-add-payment"
                onclick={() => (form = "payment")}
            >
                <CreditCardIcon /> Deposit / pre-payment
            </Button>
        </div>
    {/if}
</div>
