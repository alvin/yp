<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Combobox } from "$lib/components/ui/combobox/index.js";
    import Money from "$lib/components/app/money.svelte";
    import { depositOutcomeOptions, tenderTypeOptions } from "$lib/options.js";

    let {
        open = $bindable(false),
        resnumber,
        depositAmount = null,
        depositTender = null,
        today,
        onconfirm,
    }: {
        open?: boolean;
        resnumber: number;
        depositAmount?: number | null;
        /** The tender the deposit was taken on, offered first for a refund. */
        depositTender?: string | null;
        today: string;
        onconfirm: (result: {
            date: string;
            outcome: string;
            tender: string;
            notes: string;
        }) => void;
    } = $props();

    let date = $state(initialDate());
    let notes = $state("");
    function initialDate() {
        return today;
    }

    // A deposit on file is refunded, kept, or left held on the cancelled stay
    // until the desk knows whether the room re-rents; nothing reaches the cash
    // sheet until it is refunded or kept.
    const OUTCOMES = $derived(
        depositAmount
            ? [
                  ...depositOutcomeOptions(),
                  { value: "none", label: "Decide later" },
              ]
            : [{ value: "none", label: "No deposit on file" }],
    );
    let outcome = $state("none");
    // A refund goes back on whatever tender the desk uses, not necessarily
    // the one the deposit came in on (a card deposit returned by cheque).
    const TENDERS = tenderTypeOptions();
    let tender = $state("");
    $effect(() => {
        if (open) {
            outcome = depositAmount ? "Deposit (Refund)" : "none";
            tender = depositTender ?? "";
        }
    });
    function confirm() {
        onconfirm({ date, outcome, tender, notes });
        open = false;
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Cancel reservation #{resnumber}</Dialog.Title>
            <Dialog.Description
                >Records the cancellation and how the deposit is handled.</Dialog.Description
            >
        </Dialog.Header>

        <div class="space-y-3">
            <div class="space-y-1.5">
                <Label for="cx-date">Cancellation date</Label>
                <Input id="cx-date" type="date" bind:value={date} />
            </div>

            {#if depositAmount}
                <div
                    class="bg-muted/50 flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                    <span class="text-muted-foreground">Deposit on file</span>
                    <Money value={depositAmount} class="font-medium" />
                </div>
            {/if}

            <div class="space-y-1.5">
                <Label for="cx-outcome">Deposit handling</Label>
                <Combobox
                    id="cx-outcome"
                    bind:value={outcome}
                    options={OUTCOMES}
                />
            </div>

            {#if outcome === "Deposit (Refund)"}
                <div class="space-y-1.5">
                    <Label for="cx-tender">Tender type</Label>
                    <Combobox
                        id="cx-tender"
                        bind:value={tender}
                        options={TENDERS}
                    />
                </div>
            {/if}

            <div class="space-y-1.5">
                <Label for="cx-notes"
                    >Cancellation note (prints on the cancellation report)</Label
                >
                <Textarea
                    id="cx-notes"
                    bind:value={notes}
                    rows={3}
                    placeholder="e.g. Cancelled by guest — family conflict."
                />
            </div>
        </div>

        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (open = false)}
                >Keep reservation</Button
            >
            <Button
                variant="destructive"
                onclick={confirm}
                disabled={outcome === "Deposit (Refund)" && !tender}
                >Cancel reservation</Button
            >
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
