<script lang="ts">
    // Office-only notes on the guest record, opened from the guest page and
    // the reservation screen. They never print on anything.
    import NotebookIcon from "@lucide/svelte/icons/notebook-pen";
    import EyeOffIcon from "@lucide/svelte/icons/eye-off";
    import { toast } from "svelte-sonner";
    import { invalidateAll } from "$app/navigation";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { setGuestNotes } from "$lib/data/mutations.js";

    let {
        open = $bindable(false),
        guestid,
        notes,
    }: { open?: boolean; guestid: number; notes: string | null } = $props();

    let text = $state("");
    let saving = $state(false);

    $effect(() => {
        if (open) text = notes ?? "";
    });

    async function save() {
        saving = true;
        try {
            await setGuestNotes(guestid, text);
            open = false;
            toast.success("Guest notes saved");
            await invalidateAll();
        } catch (e) {
            toast.error(
                e instanceof Error ? e.message : "Could not save guest notes.",
            );
        } finally {
            saving = false;
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2"
                ><NotebookIcon class="size-4" /> Guest notes</Dialog.Title
            >
            <Dialog.Description class="flex items-center gap-1.5">
                <EyeOffIcon class="size-3.5" /> Office only — never printed.
            </Dialog.Description>
        </Dialog.Header>
        <Textarea
            bind:value={text}
            rows={6}
            placeholder="Preferences, history, anything the office should know…"
        />
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (open = false)}>Close</Button>
            <Button onclick={save} disabled={saving}>Save notes</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
