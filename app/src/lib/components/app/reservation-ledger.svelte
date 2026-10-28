<script lang="ts">
    import PlusIcon from "@lucide/svelte/icons/plus";
    import ReceiptIcon from "@lucide/svelte/icons/receipt";
    import CreditCardIcon from "@lucide/svelte/icons/credit-card";
    import TrashIcon from "@lucide/svelte/icons/trash-2";
    import PencilIcon from "@lucide/svelte/icons/pencil";

    import { Button } from "$lib/components/ui/button/index.js";
    import Money from "$lib/components/app/money.svelte";
    import RowAction from "$lib/components/app/row-action.svelte";
    import AddChargeDialog from "$lib/components/app/ledger/add-charge-dialog.svelte";
    import RecordPaymentDialog from "$lib/components/app/ledger/record-payment-dialog.svelte";
    import ChangeQuantityDialog from "$lib/components/app/ledger/change-quantity-dialog.svelte";
    import RemoveLineDialog from "$lib/components/app/ledger/remove-line-dialog.svelte";
    import { invalidateAll } from "$app/navigation";
    import { dateShort, money } from "$lib/format.js";
    import { round2 } from "$lib/charges.js";
    import type { LedgerRow } from "$lib/data/types.js";

    let {
        reservationguestid,
        initialLines,
        today,
    }: {
        /** The stay's guest, whom every charge and payment is posted to. */
        reservationguestid: number;
        initialLines: LedgerRow[];
        today: string;
    } = $props();

    // The database orders the lines and carries the running balance. They
    // come with the page's data.
    const lines = $derived<LedgerRow[]>(initialLines);

    const charges = $derived(
        lines.filter((l) => l.line_source === "transaction"),
    );
    const subtotal = $derived(
        round2(charges.reduce((s, l) => s + l.balance_effect, 0)),
    );
    const balance = $derived(
        lines.length ? lines[lines.length - 1].running_balance : 0,
    );

    // A charge or payment reloads the whole page, not only these lines: the
    // deposit held, which the cancel dialog offers to refund, moves with them.
    async function reload() {
        await invalidateAll();
    }

    let chargeOpen = $state(false);
    let payOpen = $state(false);

    // A line's pen changes its quantity; its bin removes it.
    let qtyOpen = $state(false);
    let removeOpen = $state(false);
    let target = $state<LedgerRow | null>(null);

    function askQuantity(line: LedgerRow) {
        target = line;
        qtyOpen = true;
    }
    function askRemove(line: LedgerRow) {
        target = line;
        removeOpen = true;
    }
</script>

<div class="rounded-xl border bg-card shadow-sm">
    <div class="flex items-center justify-between border-b px-4 py-3">
        <h2 class="flex items-center gap-2 text-sm font-semibold">
            <ReceiptIcon class="size-4" /> Transactions
        </h2>
        <div class="flex gap-2">
            <Button size="sm" variant="outline" onclick={() => (chargeOpen = true)}
                ><PlusIcon /> Charge</Button
            >
            <Button size="sm" variant="outline" onclick={() => (payOpen = true)}
                ><CreditCardIcon /> Payment</Button
            >
        </div>
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
                    <th class="w-16 py-2"
                        ><span class="sr-only">Remove</span></th
                    >
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
                                    · tax {money(l.tax_total)}{/if}
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
                        <td class="pr-2 text-right whitespace-nowrap">
                            {#if l.line_source === "transaction"}
                                <RowAction
                                    icon={PencilIcon}
                                    label="Change quantity of {l.description}"
                                    title="Change quantity"
                                    onclick={() => askQuantity(l)}
                                />
                            {/if}
                            <RowAction
                                icon={TrashIcon}
                                label="Remove {l.description}"
                                title="Remove this line"
                                destructive
                                onclick={() => askRemove(l)}
                            />
                        </td>
                    </tr>
                {:else}
                    <tr
                        ><td
                            colspan="5"
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

<AddChargeDialog
    bind:open={chargeOpen}
    {reservationguestid}
    {today}
    onsaved={reload}
/>
<RecordPaymentDialog
    bind:open={payOpen}
    {reservationguestid}
    {today}
    onsaved={reload}
/>
<ChangeQuantityDialog bind:open={qtyOpen} line={target} onsaved={reload} />
<RemoveLineDialog bind:open={removeOpen} line={target} onsaved={reload} />
