<script lang="ts">
    // Charges and receipts posted by mistake are taken off the reservation
    // here. The database archives the row rather than deleting it, so it
    // leaves the ledger, the balance, and every report while the correction
    // stays on record.
    import TrashIcon from "@lucide/svelte/icons/trash-2";
    import { toast } from "svelte-sonner";

    import { Button } from "$lib/components/ui/button/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import Money from "$lib/components/app/money.svelte";
    import { dateShort, money } from "$lib/format.js";
    import { archivePayment, archiveTransaction } from "$lib/data/mutations.js";
    import { errorMessage } from "$lib/utils.js";
    import type { LedgerRow } from "$lib/data/types.js";

    let {
        open = $bindable(false),
        line,
        onsaved,
    }: {
        open?: boolean;
        /** The charge or payment line to remove. */
        line: LedgerRow | null;
        /** Refreshes the ledger; the dialog closes once it has. */
        onsaved: () => Promise<void>;
    } = $props();

    let removing = $state(false);

    async function remove() {
        if (!line) return;
        const target = line;
        removing = true;
        try {
            if (target.line_source === "transaction")
                await archiveTransaction(target.line_id);
            else await archivePayment(target.line_id);
            await onsaved();
            open = false;
            toast.success(`Removed ${target.description}`);
        } catch (e) {
            toast.error(errorMessage(e, "Could not remove the line."));
        } finally {
            removing = false;
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-sm">
        <Dialog.Header>
            <Dialog.Title>
                Remove this {line?.line_source === "payment"
                    ? "payment"
                    : "charge"}?
            </Dialog.Title>
            <Dialog.Description>
                It comes off the balance and the reports.
            </Dialog.Description>
        </Dialog.Header>
        {#if line}
            <div class="bg-muted/40 rounded-lg border px-3 py-2 text-sm">
                <div class="flex items-center justify-between gap-3">
                    <span class="min-w-0 truncate font-medium"
                        >{line.description}</span
                    >
                    <Money value={line.balance_effect} class="shrink-0" />
                </div>
                <div class="text-muted-foreground mt-0.5 text-xs">
                    {dateShort(line.line_date)} · {line.code ??
                        line.line_type}
                    {#if line.tax_total > 0}
                        · tax {money(line.tax_total)}{/if}
                </div>
            </div>
        {/if}
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (open = false)}
                >Keep it</Button
            >
            <Button
                variant="destructive"
                disabled={removing}
                onclick={remove}
            >
                <TrashIcon /> Remove line
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
