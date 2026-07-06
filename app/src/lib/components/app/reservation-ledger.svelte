<script lang="ts">
    import PlusIcon from "@lucide/svelte/icons/plus";
    import ReceiptIcon from "@lucide/svelte/icons/receipt";
    import CreditCardIcon from "@lucide/svelte/icons/credit-card";
    import { toast } from "svelte-sonner";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as Select from "$lib/components/ui/select/index.js";
    import Money from "$lib/components/app/money.svelte";
    import { addDays, dateShort } from "$lib/format.js";
    import { reservationLedger } from "$lib/data/queries.js";
    import {
        postCharge,
        postRoomNights,
        recordPayment,
    } from "$lib/data/mutations.js";
    import { round2, usdToCdn } from "$lib/charges.js";
    import {
        INVENTORY_ITEMS,
        INV_TYPE_TO_TRANSTYPE,
        PAYMENT_CATEGORIES,
        PAYMENT_CURRENCIES,
        PAYMENT_TYPES,
        ROOMS,
        inventoryById,
        roomById,
        roomOptionLabel,
    } from "$lib/data/reference.js";
    import type {
        LedgerRow,
        ReservationGuestSummary,
    } from "$lib/data/types.js";

    let {
        reservationid,
        initialLines,
        reservationGuests,
        today,
        readonly = false,
    }: {
        reservationid: number;
        initialLines: LedgerRow[];
        reservationGuests: ReservationGuestSummary[];
        today: string;
        readonly?: boolean;
    } = $props();

    let lines = $state<LedgerRow[]>(seedLines());

    function seedLines(): LedgerRow[] {
        return rebalance([...initialLines]);
    }

    function rebalance(rows: LedgerRow[]): LedgerRow[] {
        const sorted = [...rows].sort(
            (a, b) =>
                a.line_date.localeCompare(b.line_date) ||
                a.line_source.localeCompare(b.line_source) ||
                a.line_id - b.line_id,
        );
        let running = 0;
        return sorted.map((l) => {
            running = round2(running + l.balance_effect);
            return { ...l, running_balance: running };
        });
    }

    const charges = $derived(
        lines.filter((l) => l.line_source === "transaction"),
    );
    const subtotal = $derived(
        round2(charges.reduce((s, l) => s + l.balance_effect, 0)),
    );
    const balance = $derived(
        lines.length ? lines[lines.length - 1].running_balance : 0,
    );

    const defaultGuest = $derived(
        reservationGuests.find((g) => g.primaryguest)?.reservationguestid ??
            reservationGuests[0]?.reservationguestid ??
            0,
    );

    // ---- Add charge ----
    let chargeOpen = $state(false);
    let chargeKind = $state<"room" | "item">("room");
    let cRoom = $state(String(ROOMS[0].roomid));
    let cItem = $state(String(INVENTORY_ITEMS[0].inventoryid));
    let cQty = $state(1);
    let cUnit = $state(0);
    let cDate = $state("");
    let cNotes = $state("");
    let cGuest = $state("");

    function openCharge() {
        chargeKind = "room";
        cRoom = String(ROOMS[0].roomid);
        cItem = String(INVENTORY_ITEMS[0].inventoryid);
        cQty = 1;
        cUnit = 0;
        cDate = today;
        cNotes = "";
        cGuest = String(defaultGuest);
        chargeOpen = true;
    }

    function onItemChange(id: string) {
        cItem = id;
        cUnit = inventoryById(Number(id))?.invamount ?? 0;
    }

    const cRoomLabel = $derived(
        roomOptionLabel(roomById(Number(cRoom)) ?? ROOMS[0]),
    );
    const cItemLabel = $derived(() => {
        const i = inventoryById(Number(cItem));
        return i ? `${i.invcode} · ${i.invitemdescription}` : "Select item";
    });
    const cGuestLabel = $derived(
        reservationGuests.find((g) => String(g.reservationguestid) === cGuest)
            ?.guest_name ?? "Select guest",
    );

    async function saveCharge() {
        const qty = Math.max(1, Number(cQty) || 1);
        const unit = round2(Number(cUnit) || 0);
        const rgid = Number(cGuest) || defaultGuest;
        try {
            let description: string;
            if (chargeKind === "room") {
                const room = roomById(Number(cRoom))!;
                description =
                    room.roomname +
                    (room.roomnumber ? ` ${room.roomnumber}` : "");
                await postRoomNights(
                    rgid,
                    room.roomid,
                    cDate,
                    addDays(cDate, qty),
                    unit > 0 ? unit : null,
                    cDate,
                    cNotes.trim() || null,
                );
            } else {
                const inv = inventoryById(Number(cItem))!;
                description = inv.invitemdescription ?? inv.invtype;
                await postCharge(
                    rgid,
                    inv.inventoryid,
                    qty,
                    cDate,
                    round2(unit * qty),
                    INV_TYPE_TO_TRANSTYPE[inv.invtype] ?? "Misc.",
                    cNotes.trim() || null,
                );
            }
            lines = await reservationLedger(reservationid);
            chargeOpen = false;
            toast.success(`Added ${description}`);
        } catch (e) {
            toast.error(
                e instanceof Error ? e.message : "Could not add the charge.",
            );
        }
    }

    // ---- Add payment ----
    let payOpen = $state(false);
    let pCategory = $state("Payment (Regular)");
    let pType = $state("Visa");
    let pCurrency = $state("Canadian");
    let pAmount = $state(0);
    let pCdn = $state(0);
    let pDate = $state("");
    let pNotes = $state("");
    let pGuest = $state("");

    function openPayment() {
        pCategory = "Payment (Regular)";
        pType = "Visa";
        pCurrency = "Canadian";
        pAmount = 0;
        pCdn = 0;
        pDate = today;
        pNotes = "";
        pGuest = String(defaultGuest);
        payOpen = true;
    }

    const pGuestLabel = $derived(
        reservationGuests.find((g) => String(g.reservationguestid) === pGuest)
            ?.guest_name ?? "Select guest",
    );

    $effect(() => {
        if (pCurrency === "US") pCdn = usdToCdn(Number(pAmount) || 0);
        else pCdn = round2(Number(pAmount) || 0);
    });

    const pCatLabel = $derived(pCategory);
    const pTypeLabel = $derived(pType);
    const pCurLabel = $derived(
        pCurrency === "US" ? "US dollars" : "Canadian dollars",
    );

    async function savePayment() {
        const amount = round2(Number(pAmount) || 0);
        if (!amount) {
            toast.error("Enter a payment amount.");
            return;
        }
        try {
            await recordPayment(
                Number(pGuest) || defaultGuest,
                pCategory,
                pType,
                amount,
                pCurrency,
                pDate,
                pNotes.trim() || null,
            );
            lines = await reservationLedger(reservationid);
            payOpen = false;
            toast.success(
                `Recorded ${pCategory} — $${amount.toFixed(2)} ${pType}`,
            );
        } catch (e) {
            toast.error(
                e instanceof Error ? e.message : "Could not record the payment.",
            );
        }
    }
</script>

<div class="rounded-xl border bg-card shadow-sm">
    <div class="flex items-center justify-between border-b px-4 py-3">
        <h2 class="flex items-center gap-2 text-sm font-semibold">
            <ReceiptIcon class="size-4" /> Transactions
        </h2>
        {#if !readonly}
            <div class="flex gap-2">
                <Button size="sm" variant="outline" onclick={openCharge}
                    ><PlusIcon /> Charge</Button
                >
                <Button size="sm" variant="outline" onclick={openPayment}
                    ><CreditCardIcon /> Payment</Button
                >
            </div>
        {/if}
    </div>

    <div class="max-h-[420px] overflow-y-auto">
        <table class="w-full text-sm">
            <thead
                class="text-muted-foreground sticky top-0 bg-card text-[11px] uppercase"
            >
                <tr class="border-b">
                    <th class="px-4 py-2 text-left font-medium">Date</th>
                    <th class="py-2 text-left font-medium">Description</th>
                    <th class="py-2 text-right font-medium">Qty</th>
                    <th class="px-4 py-2 text-right font-medium">Amount</th>
                </tr>
            </thead>
            <tbody>
                {#each lines as l (l.line_id)}
                    <tr class="border-b last:border-0">
                        <td
                            class="text-muted-foreground px-4 py-2 whitespace-nowrap tabular-nums"
                            >{dateShort(l.line_date)}</td
                        >
                        <td class="py-2">
                            <span class="font-medium">{l.description}</span>
                            <span class="text-muted-foreground ml-1.5 text-xs">
                                {l.code
                                    ? l.code
                                    : l.line_type}{#if l.tax_total > 0}
                                    · tax ${l.tax_total.toFixed(2)}{/if}
                            </span>
                        </td>
                        <td class="py-2 text-right tabular-nums"
                            >{l.line_source === "transaction"
                                ? l.quantity
                                : ""}</td
                        >
                        <td class="px-4 py-2 text-right"
                            ><Money value={l.balance_effect} /></td
                        >
                    </tr>
                {:else}
                    <tr
                        ><td
                            colspan="4"
                            class="text-muted-foreground px-4 py-8 text-center"
                            >No transactions yet.</td
                        ></tr
                    >
                {/each}
            </tbody>
        </table>
    </div>

    <div class="space-y-1.5 border-t px-4 py-3 text-sm">
        <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Charges & tax subtotal</span>
            <Money value={subtotal} class="font-medium" />
        </div>
        <div
            class="flex items-center justify-between border-t pt-1.5 text-base font-semibold"
        >
            <span>Balance owing</span>
            <Money value={balance} muteZero />
        </div>
        <p class="text-muted-foreground pt-1 text-[11px]">
            Deposits and payments reduce the balance and show as negative lines.
        </p>
    </div>
</div>

<!-- Add charge dialog -->
<Dialog.Root bind:open={chargeOpen}>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>Add charge</Dialog.Title>
            <Dialog.Description
                >Room nights and extras. Prices can be overridden.</Dialog.Description
            >
        </Dialog.Header>
        <div class="space-y-3">
            <div class="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
                <button
                    type="button"
                    class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {chargeKind ===
                    'room'
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground'}"
                    onclick={() => (chargeKind = "room")}>Room night</button
                >
                <button
                    type="button"
                    class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {chargeKind ===
                    'item'
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground'}"
                    onclick={() => (chargeKind = "item")}>Item / extra</button
                >
            </div>

            {#if chargeKind === "room"}
                <div class="space-y-1.5">
                    <Label>Room</Label>
                    <Select.Root type="single" bind:value={cRoom}>
                        <Select.Trigger class="w-full"
                            >{cRoomLabel}</Select.Trigger
                        >
                        <Select.Content>
                            {#each ROOMS as r (r.roomid)}
                                <Select.Item
                                    value={String(r.roomid)}
                                    label={roomOptionLabel(r)}
                                    >{roomOptionLabel(r)}</Select.Item
                                >
                            {/each}
                        </Select.Content>
                    </Select.Root>
                    <p class="text-muted-foreground text-xs">
                        Bed layout shown beside each room.
                    </p>
                </div>
            {:else}
                <div class="space-y-1.5">
                    <Label>Item</Label>
                    <Select.Root
                        type="single"
                        value={cItem}
                        onValueChange={onItemChange}
                    >
                        <Select.Trigger class="w-full"
                            >{cItemLabel()}</Select.Trigger
                        >
                        <Select.Content>
                            {#each INVENTORY_ITEMS as i (i.inventoryid)}
                                <Select.Item
                                    value={String(i.inventoryid)}
                                    label={`${i.invcode} · ${i.invitemdescription}`}
                                >
                                    {i.invcode} · {i.invitemdescription}
                                </Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
            {/if}

            <div class="grid grid-cols-3 gap-3">
                <div class="space-y-1.5">
                    <Label for="c-qty"
                        >{chargeKind === "room" ? "Nights" : "Qty"}</Label
                    >
                    <Input id="c-qty" type="number" min="1" bind:value={cQty} />
                </div>
                <div class="space-y-1.5">
                    <Label for="c-unit">Unit price</Label>
                    <Input
                        id="c-unit"
                        type="number"
                        step="0.01"
                        min="0"
                        bind:value={cUnit}
                    />
                </div>
                <div class="space-y-1.5">
                    <Label for="c-date">Date</Label>
                    <Input id="c-date" type="date" bind:value={cDate} />
                </div>
            </div>

            {#if reservationGuests.length > 1}
                <div class="space-y-1.5">
                    <Label>Charge to</Label>
                    <Select.Root type="single" bind:value={cGuest}>
                        <Select.Trigger class="w-full"
                            >{cGuestLabel}</Select.Trigger
                        >
                        <Select.Content>
                            {#each reservationGuests as g (g.reservationguestid)}
                                <Select.Item
                                    value={String(g.reservationguestid)}
                                    label={g.guest_name}
                                    >{g.guest_name}</Select.Item
                                >
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
            {/if}

            <div class="space-y-1.5">
                <Label for="c-notes">Notes (optional)</Label>
                <Input
                    id="c-notes"
                    bind:value={cNotes}
                    placeholder="Overrides the line description"
                />
            </div>
        </div>
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (chargeOpen = false)}
                >Cancel</Button
            >
            <Button onclick={saveCharge}>Add charge</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<!-- Add payment dialog -->
<Dialog.Root bind:open={payOpen}>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>Record payment or deposit</Dialog.Title>
            <Dialog.Description
                >US funds convert to Canadian dollars automatically.</Dialog.Description
            >
        </Dialog.Header>
        <div class="space-y-3">
            <div class="space-y-1.5">
                <Label>Category</Label>
                <Select.Root type="single" bind:value={pCategory}>
                    <Select.Trigger class="w-full">{pCatLabel}</Select.Trigger>
                    <Select.Content>
                        {#each PAYMENT_CATEGORIES as c (c.paymentcategory)}
                            <Select.Item
                                value={c.paymentcategory}
                                label={c.paymentcategory}
                                >{c.paymentcategory}</Select.Item
                            >
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                    <Label>Tender type</Label>
                    <Select.Root type="single" bind:value={pType}>
                        <Select.Trigger class="w-full"
                            >{pTypeLabel}</Select.Trigger
                        >
                        <Select.Content>
                            {#each PAYMENT_TYPES as t (t.paymenttype)}
                                <Select.Item
                                    value={t.paymenttype}
                                    label={t.paymenttype}
                                    >{t.paymenttype}</Select.Item
                                >
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
                <div class="space-y-1.5">
                    <Label>Funds</Label>
                    <Select.Root type="single" bind:value={pCurrency}>
                        <Select.Trigger class="w-full"
                            >{pCurLabel}</Select.Trigger
                        >
                        <Select.Content>
                            {#each PAYMENT_CURRENCIES as c (c)}
                                <Select.Item value={c} label={c}
                                    >{c} dollars</Select.Item
                                >
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div class="space-y-1.5">
                    <Label for="p-amt">Amount</Label>
                    <Input
                        id="p-amt"
                        type="number"
                        step="0.01"
                        min="0"
                        bind:value={pAmount}
                    />
                </div>
                <div class="space-y-1.5">
                    <Label for="p-cdn">CDN value (est.)</Label>
                    <Input
                        id="p-cdn"
                        type="number"
                        step="0.01"
                        min="0"
                        bind:value={pCdn}
                        disabled
                    />
                </div>
                <div class="space-y-1.5">
                    <Label for="p-date">Date</Label>
                    <Input id="p-date" type="date" bind:value={pDate} />
                </div>
            </div>
            {#if reservationGuests.length > 1}
                <div class="space-y-1.5">
                    <Label>Received from</Label>
                    <Select.Root type="single" bind:value={pGuest}>
                        <Select.Trigger class="w-full"
                            >{pGuestLabel}</Select.Trigger
                        >
                        <Select.Content>
                            {#each reservationGuests as g (g.reservationguestid)}
                                <Select.Item
                                    value={String(g.reservationguestid)}
                                    label={g.guest_name}
                                    >{g.guest_name}</Select.Item
                                >
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
            {/if}

            <div class="space-y-1.5">
                <Label for="p-notes">Notes (optional)</Label>
                <Input id="p-notes" bind:value={pNotes} />
            </div>
        </div>
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (payOpen = false)}
                >Cancel</Button
            >
            <Button onclick={savePayment}>Record</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
