<script lang="ts">
    import PlusIcon from "@lucide/svelte/icons/plus";
    import ReceiptIcon from "@lucide/svelte/icons/receipt";
    import CreditCardIcon from "@lucide/svelte/icons/credit-card";
    import TrashIcon from "@lucide/svelte/icons/trash-2";
    import { toast } from "svelte-sonner";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Combobox } from "$lib/components/ui/combobox/index.js";
    import Money from "$lib/components/app/money.svelte";
    import { addDays, dateShort, money } from "$lib/format.js";
    import { reservationLedger } from "$lib/data/queries.js";
    import {
        archivePayment,
        archiveTransaction,
        postCharge,
        postRoomNights,
        recordPayment,
    } from "$lib/data/mutations.js";
    import { round2, usdToCdn } from "$lib/charges.js";
    import {
        INV_TYPE_TO_TRANSTYPE,
        ROOMS,
        inventoryById,
        roomById,
    } from "$lib/data/reference.js";
    import {
        currencyOptions,
        itemOptions,
        paymentCategoryOptions,
        roomOptions,
        tenderTypeOptions,
    } from "$lib/options.js";
    import type { LedgerRow, ReservationGuestSummary } from "$lib/data/types.js";

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
    let cItem = $state("");
    let cQty = $state(1);
    let cUnit = $state(0);
    let cDate = $state("");
    let cNotes = $state("");
    let cGuest = $state("");

    function openCharge() {
        chargeKind = "room";
        cRoom = String(ROOMS[0].roomid);
        cItem = "";
        cQty = 1;
        cUnit = 0;
        cDate = today;
        cNotes = "";
        cGuest = String(defaultGuest);
        chargeOpen = true;
    }

    function onItemChange(id: string) {
        cUnit = inventoryById(Number(id))?.invamount ?? 0;
    }

    const rooms = roomOptions();
    const items = itemOptions();
    const categories = paymentCategoryOptions();
    const tenders = tenderTypeOptions();
    const currencies = currencyOptions();
    const guestPickerOptions = $derived(
        reservationGuests.map((g) => ({
            value: String(g.reservationguestid),
            label: g.guest_name,
        })),
    );

    async function saveCharge() {
        const qty = Math.max(1, Number(cQty) || 1);
        const unit = round2(Number(cUnit) || 0);
        const rgid = Number(cGuest) || defaultGuest;
        if (chargeKind === "item" && !cItem) {
            toast.error("Choose an item to charge.");
            return;
        }
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

    $effect(() => {
        if (pCurrency === "US") pCdn = usdToCdn(Number(pAmount) || 0);
        else pCdn = round2(Number(pAmount) || 0);
    });

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

    // ---- Remove a line entered in error ----
    // Charges and receipts posted by mistake are taken off the reservation
    // here. The database archives the row rather than deleting it, so it
    // leaves the ledger, the balance, and every report while the correction
    // stays on record.
    let removeOpen = $state(false);
    let removing = $state(false);
    let target = $state<LedgerRow | null>(null);

    function askRemove(line: LedgerRow) {
        target = line;
        removeOpen = true;
    }

    async function confirmRemove() {
        const line = target;
        if (!line) return;
        removing = true;
        try {
            if (line.line_source === "transaction")
                await archiveTransaction(line.line_id);
            else await archivePayment(line.line_id);
            lines = await reservationLedger(reservationid);
            removeOpen = false;
            target = null;
            toast.success(`Removed ${line.description}`);
        } catch (e) {
            toast.error(
                e instanceof Error ? e.message : "Could not remove the line.",
            );
        } finally {
            removing = false;
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
                    {#if !readonly}<th class="w-9 py-2"
                            ><span class="sr-only">Remove</span></th
                        >{/if}
                </tr>
            </thead>
            <tbody>
                {#each lines as l (`${l.line_source}:${l.line_id}`)}
                    <tr class="group border-b last:border-0">
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
                        {#if !readonly}
                            <td class="pr-2 text-right">
                                <button
                                    type="button"
                                    aria-label="Remove {l.description}"
                                    title="Remove this line"
                                    onclick={() => askRemove(l)}
                                    class="text-muted-foreground hover:text-destructive rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                >
                                    <TrashIcon class="size-3.5" />
                                </button>
                            </td>
                        {/if}
                    </tr>
                {:else}
                    <tr
                        ><td
                            colspan={readonly ? 4 : 5}
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
    </div>
</div>

<!-- Add charge dialog -->
<Dialog.Root bind:open={chargeOpen}>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>Add charge</Dialog.Title>
            <Dialog.Description
                >Room nights and extras.</Dialog.Description
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
                    <Label for="c-room">Room</Label>
                    <Combobox
                        id="c-room"
                        bind:value={cRoom}
                        options={rooms}
                        searchPlaceholder="Room name or number…"
                    />
                </div>
            {:else}
                <div class="space-y-1.5">
                    <Label for="c-item">Item</Label>
                    <Combobox
                        id="c-item"
                        bind:value={cItem}
                        options={items}
                        placeholder="Choose an item"
                        searchPlaceholder="Item code or name…"
                        onchange={onItemChange}
                    />
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
                    <Label for="c-guest">Charge to</Label>
                    <Combobox
                        id="c-guest"
                        bind:value={cGuest}
                        options={guestPickerOptions}
                    />
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
                >Deposits, payments, and refunds.</Dialog.Description
            >
        </Dialog.Header>
        <div class="space-y-3">
            <div class="space-y-1.5">
                <Label for="p-cat">Category</Label>
                <Combobox
                    id="p-cat"
                    bind:value={pCategory}
                    options={categories}
                />
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                    <Label for="p-type">Tender type</Label>
                    <Combobox
                        id="p-type"
                        bind:value={pType}
                        options={tenders}
                    />
                </div>
                <div class="space-y-1.5">
                    <Label for="p-cur">Funds</Label>
                    <Combobox
                        id="p-cur"
                        bind:value={pCurrency}
                        options={currencies}
                    />
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
                    <Label for="p-guest">Received from</Label>
                    <Combobox
                        id="p-guest"
                        bind:value={pGuest}
                        options={guestPickerOptions}
                    />
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

<!-- Remove a line entered in error -->
<Dialog.Root bind:open={removeOpen}>
    <Dialog.Content class="sm:max-w-sm">
        <Dialog.Header>
            <Dialog.Title>
                Remove this {target?.line_source === "payment"
                    ? "payment"
                    : "charge"}?
            </Dialog.Title>
            <Dialog.Description>
                It comes off the balance and the reports.
            </Dialog.Description>
        </Dialog.Header>
        {#if target}
            <div class="bg-muted/40 rounded-lg border px-3 py-2 text-sm">
                <div class="flex items-center justify-between gap-3">
                    <span class="min-w-0 truncate font-medium"
                        >{target.description}</span
                    >
                    <Money value={target.balance_effect} class="shrink-0" />
                </div>
                <div class="text-muted-foreground mt-0.5 text-xs">
                    {dateShort(target.line_date)} · {target.code ??
                        target.line_type}
                    {#if target.tax_total > 0}
                        · tax {money(target.tax_total)}{/if}
                </div>
            </div>
        {/if}
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (removeOpen = false)}
                >Keep it</Button
            >
            <Button
                variant="destructive"
                disabled={removing}
                onclick={confirmRemove}
            >
                <TrashIcon /> Remove line
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
