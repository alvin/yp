<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Combobox } from "$lib/components/ui/combobox/index.js";
    import Money from "$lib/components/app/money.svelte";
    import { depositOutcomeOptions } from "$lib/options.js";

    // A cancelled stay's deposit left to decide later, refunded or kept once
    // the desk knows; dated the day it is settled, which is when the cash
    // sheet sees it.
    let {
        open = $bindable(false),
        resnumber,
        depositAmount,
        today,
        onconfirm,
    }: {
        open?: boolean;
        resnumber: number;
        depositAmount: number;
        today: string;
        onconfirm: (result: { date: string; outcome: string }) => void;
    } = $props();

    const OUTCOMES = depositOutcomeOptions();
    let date = $state("");
    let outcome = $state(OUTCOMES[0].value);
    $effect(() => {
        if (open) {
            date = today;
            outcome = OUTCOMES[0].value;
        }
    });

    function confirm() {
        onconfirm({ date, outcome });
        open = false;
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Settle the deposit on #{resnumber}</Dialog.Title>
            <Dialog.Description
                >Records how the deposit is handled.</Dialog.Description
            >
        </Dialog.Header>

        <div class="space-y-3">
            <div class="space-y-1.5">
                <Label for="sd-date">Date</Label>
                <Input id="sd-date" type="date" bind:value={date} />
            </div>

            <div
                class="bg-muted/50 flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
                <span class="text-muted-foreground">Deposit on file</span>
                <Money value={depositAmount} class="font-medium" />
            </div>

            <div class="space-y-1.5">
                <Label for="sd-outcome">Deposit handling</Label>
                <Combobox
                    id="sd-outcome"
                    bind:value={outcome}
                    options={OUTCOMES}
                />
            </div>
        </div>

        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (open = false)}
                >Cancel</Button
            >
            <Button onclick={confirm} disabled={!date}>Settle deposit</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
