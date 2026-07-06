<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as Select from "$lib/components/ui/select/index.js";
    import Money from "$lib/components/app/money.svelte";

    let {
        open = $bindable(false),
        resnumber,
        depositAmount = null,
        today,
        onconfirm,
    }: {
        open?: boolean;
        resnumber: number;
        depositAmount?: number | null;
        today: string;
        onconfirm: (result: {
            date: string;
            outcome: string;
            notes: string;
        }) => void;
    } = $props();

    let date = $state(initialDate());
    let notes = $state("");
    function initialDate() {
        return today;
    }

    const OUTCOMES = [
        { value: "none", label: "No deposit on file" },
        { value: "Deposit (Refund)", label: "Refund the deposit" },
        { value: "Deposit (Kept)", label: "Keep the deposit" },
    ];
    let outcome = $state(initialOutcome());
    function initialOutcome() {
        return depositAmount ? "Deposit (Refund)" : "none";
    }
    const outcomeLabel = $derived(
        OUTCOMES.find((o) => o.value === outcome)?.label ??
            "No deposit on file",
    );

    function confirm() {
        onconfirm({ date, outcome, notes });
        open = false;
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Cancel reservation #{resnumber}</Dialog.Title>
            <Dialog.Description
                >Records the cancellation date and how the deposit is handled.</Dialog.Description
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
                <Label>Deposit handling</Label>
                <Select.Root type="single" bind:value={outcome}>
                    <Select.Trigger class="w-full"
                        >{outcomeLabel}</Select.Trigger
                    >
                    <Select.Content>
                        {#each OUTCOMES as o (o.value)}
                            <Select.Item value={o.value} label={o.label}
                                >{o.label}</Select.Item
                            >
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>

            <div class="space-y-1.5">
                <Label for="cx-notes"
                    >Cancellation note (prints on the notice)</Label
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
            <Button variant="destructive" onclick={confirm}
                >Cancel reservation</Button
            >
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
