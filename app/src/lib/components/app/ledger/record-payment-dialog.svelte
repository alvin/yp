<script lang="ts">
    import { untrack } from "svelte";
    import { toast } from "svelte-sonner";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Combobox } from "$lib/components/ui/combobox/index.js";
    import { money } from "$lib/format.js";
    import { recordPayment } from "$lib/data/mutations.js";
    import { round2 } from "$lib/charges.js";
    import { paymentCategoryOptions, tenderTypeOptions } from "$lib/options.js";
    import { errorMessage } from "$lib/utils.js";

    let {
        open = $bindable(false),
        reservationguestid,
        today,
        onsaved,
    }: {
        open?: boolean;
        /** The stay's guest, whom the payment is recorded against. */
        reservationguestid: number;
        today: string;
        /** Refreshes the ledger; the dialog closes once it has. */
        onsaved: () => Promise<void>;
    } = $props();

    let pCategory = $state("Payment (Regular)");
    let pType = $state("Visa");
    let pAmount = $state(0);
    let pDate = $state("");
    let pNotes = $state("");

    $effect(() => {
        if (open)
            untrack(() => {
                pCategory = "Payment (Regular)";
                pType = "Visa";
                pAmount = 0;
                pDate = today;
                pNotes = "";
            });
    });

    const categories = paymentCategoryOptions();
    const tenders = tenderTypeOptions();

    async function save() {
        const amount = round2(Number(pAmount) || 0);
        if (!amount) {
            toast.error("Enter a payment amount.");
            return;
        }
        try {
            await recordPayment(
                reservationguestid,
                pCategory,
                pType,
                amount,
                pDate,
                pNotes.trim() || null,
            );
            await onsaved();
            open = false;
            toast.success(
                `Recorded ${pCategory} — ${money(amount)} ${pType}`,
            );
        } catch (e) {
            toast.error(errorMessage(e, "Could not record the payment."));
        }
    }
</script>

<Dialog.Root bind:open>
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
            <div class="grid grid-cols-3 gap-3">
                <div class="space-y-1.5">
                    <Label for="p-type">Tender type</Label>
                    <Combobox
                        id="p-type"
                        bind:value={pType}
                        options={tenders}
                    />
                </div>
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
                    <Label for="p-date">Date</Label>
                    <Input id="p-date" type="date" bind:value={pDate} />
                </div>
            </div>

            <div class="space-y-1.5">
                <Label for="p-notes">Notes (optional)</Label>
                <Input id="p-notes" bind:value={pNotes} />
            </div>
        </div>
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (open = false)}
                >Cancel</Button
            >
            <Button onclick={save}>Record</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
