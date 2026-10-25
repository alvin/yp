<script lang="ts">
    // Change a room outright — the stay holds another room for the same
    // nights. The database refuses while a room charge for the old room is
    // posted over them, or when the new room is the one the stay moves from or
    // to next door (that is undoing the move).
    import { toast } from "svelte-sonner";
    import { invalidateAll } from "$app/navigation";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Combobox } from "$lib/components/ui/combobox/index.js";
    import { roomWindow } from "$lib/format.js";
    import { roomById, roomName } from "$lib/data/reference.js";
    import { roomOptions } from "$lib/options.js";
    import { roomsBooked } from "$lib/data/queries.js";
    import { changeRoom } from "$lib/data/mutations.js";
    import { errorMessage } from "$lib/utils.js";
    import type { OccupancySummary } from "$lib/data/types.js";

    let {
        open = $bindable(false),
        target,
    }: { open?: boolean; target: OccupancySummary | null } = $props();

    let to = $state("");
    let saving = $state(false);
    let booked = $state(new Set<number>());
    const rooms = roomOptions();
    const options = $derived(
        rooms
            .filter((o) => o.value !== String(target?.roomid))
            .map((o) => (booked.has(Number(o.value)) ? { ...o, hint: "Booked" } : o)),
    );

    $effect(() => {
        const o = target;
        if (!open || !o) return;
        let alive = true;
        to = "";
        booked = new Set();
        roomsBooked(o.occupancyin, o.occupancyout)
            .then((b) => alive && (booked = b))
            .catch(() => {});
        return () => (alive = false);
    });

    async function save() {
        const o = target;
        if (!o || !to) return;
        saving = true;
        try {
            await changeRoom(o.occupancyid, Number(to));
            await invalidateAll();
            open = false;
            toast.success(`Room changed — ${roomName(roomById(Number(to))!)}`);
        } catch (e) {
            toast.error(errorMessage(e, "Could not change the room."));
        } finally {
            saving = false;
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-sm">
        <Dialog.Header>
            <Dialog.Title>Change room</Dialog.Title>
            {#if target}
                <Dialog.Description>{roomWindow(target)}</Dialog.Description>
            {/if}
        </Dialog.Header>
        <div class="space-y-1.5">
            <Label for="cr-room">New room</Label>
            <Combobox
                id="cr-room"
                bind:value={to}
                options={options}
                placeholder="Select room"
                searchPlaceholder="Room name or number…"
            />
        </div>
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
            <Button disabled={saving || !to} onclick={save}>Change room</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
