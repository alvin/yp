<script lang="ts">
    // A guest's drinks over a stay kept on one line: the line keeps its price
    // per unit and the database reprices it and its taxes. On a room line the
    // quantity is nights.
    import { untrack } from "svelte";
    import { toast } from "svelte-sonner";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { dateShort } from "$lib/format.js";
    import { changeChargeQuantity } from "$lib/data/mutations.js";
    import { errorMessage } from "$lib/utils.js";
    import type { LedgerRow } from "$lib/data/types.js";

    let {
        open = $bindable(false),
        line,
        onsaved,
    }: {
        open?: boolean;
        /** The charge line whose quantity changes. */
        line: LedgerRow | null;
        /** Refreshes the ledger; the dialog closes once it has. */
        onsaved: () => Promise<void>;
    } = $props();

    let saving = $state(false);
    let newQty = $state(1);
    const valid = $derived(
        Number.isInteger(Number(newQty)) && Number(newQty) >= 1,
    );

    $effect(() => {
        if (open && line) {
            const quantity = line.quantity;
            untrack(() => (newQty = quantity));
        }
    });

    async function save() {
        if (!line || !valid) return;
        const target = line;
        const qty = Number(newQty);
        saving = true;
        try {
            await changeChargeQuantity(target.line_id, qty);
            await onsaved();
            open = false;
            toast.success(`Changed ${target.description} to ${qty}`);
        } catch (e) {
            toast.error(errorMessage(e, "Could not change the quantity."));
        } finally {
            saving = false;
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-sm">
        <Dialog.Header>
            <Dialog.Title>Change quantity</Dialog.Title>
            {#if line}
                <Dialog.Description>
                    {line.description} · {dateShort(line.line_date)}
                </Dialog.Description>
            {/if}
        </Dialog.Header>
        <div class="space-y-1.5">
            <Label for="q-qty"
                >{line?.line_type === "Room" ? "Nights" : "Qty"}</Label
            >
            <Input
                id="q-qty"
                type="number"
                min="1"
                step="1"
                bind:value={newQty}
                aria-invalid={!valid}
            />
        </div>
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (open = false)}
                >Cancel</Button
            >
            <Button
                disabled={saving ||
                    !valid ||
                    Number(newQty) === line?.quantity}
                onclick={save}>Change quantity</Button
            >
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
