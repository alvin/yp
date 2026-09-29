<script lang="ts">
    // Correcting a guest's details from their page. Every field of the record
    // the front desk keeps is here; an emptied field is cleared.
    import { toast } from "svelte-sonner";
    import { invalidateAll } from "$app/navigation";

    import { Button } from "$lib/components/ui/button/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import GuestFields from "$lib/components/app/guest-fields.svelte";
    import { updateGuest } from "$lib/data/mutations.js";
    import { guestForm } from "$lib/guest-form.js";
    import type { Guest } from "$lib/data/types.js";

    let { open = $bindable(false), guest }: { open?: boolean; guest: Guest } =
        $props();

    let form = $state(guestForm());
    let saving = $state(false);

    $effect(() => {
        if (open) form = guestForm(guest);
    });

    async function save() {
        saving = true;
        try {
            await updateGuest(guest.guestid, form);
            open = false;
            toast.success("Guest details saved");
            await invalidateAll();
        } catch (e) {
            toast.error(
                e instanceof Error ? e.message : "Could not save the details.",
            );
        } finally {
            saving = false;
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-lg">
        <Dialog.Header>
            <Dialog.Title>Guest details</Dialog.Title>
        </Dialog.Header>
        <div class="space-y-3">
            <GuestFields bind:form detailed />
        </div>
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
            <Button onclick={save} disabled={saving || !form.lastName.trim()}
                >Save details</Button
            >
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
