<script lang="ts" module>
    export const GUEST_NOTES_PLACEHOLDER =
        "Preferences, history, anything the office should know…";
</script>

<script lang="ts">
    // Office-only notes: the guest's (guest page and reservation screen) and
    // the reservation's own. They never print on anything.
    import NotebookIcon from "@lucide/svelte/icons/notebook-pen";
    import EyeOffIcon from "@lucide/svelte/icons/eye-off";
    import { toast } from "svelte-sonner";
    import { invalidateAll } from "$app/navigation";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { errorMessage } from "$lib/utils.js";

    let {
        open = $bindable(false),
        title,
        notes,
        placeholder,
        save: saveNotes,
    }: {
        open?: boolean;
        /** "Guest notes", "Reservation notes" — also names the toasts. */
        title: string;
        notes: string | null;
        placeholder: string;
        save: (text: string) => Promise<void>;
    } = $props();

    let text = $state("");
    let saving = $state(false);

    $effect(() => {
        if (open) text = notes ?? "";
    });

    async function save() {
        saving = true;
        try {
            await saveNotes(text);
            open = false;
            toast.success(`${title} saved`);
            await invalidateAll();
        } catch (e) {
            toast.error(errorMessage(e, `Could not save ${title.toLowerCase()}.`));
        } finally {
            saving = false;
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2"
                ><NotebookIcon class="size-4" /> {title}</Dialog.Title
            >
            <Dialog.Description class="flex items-center gap-1.5">
                <EyeOffIcon class="size-3.5" /> Office only — never printed.
            </Dialog.Description>
        </Dialog.Header>
        <Textarea bind:value={text} rows={6} {placeholder} />
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (open = false)}>Close</Button>
            <Button onclick={save} disabled={saving}>Save notes</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
