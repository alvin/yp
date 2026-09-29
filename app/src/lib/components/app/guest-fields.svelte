<script lang="ts">
    // A guest's details, as the booking screen and the guest page edit them.
    // `detailed` adds the phone types and the second phone the booking screen
    // leaves off.
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Combobox } from "$lib/components/ui/combobox/index.js";
    import PhoneInput from "$lib/components/app/phone-input.svelte";
    import { PHONE_TYPES, SALUTATIONS } from "$lib/data/reference.js";
    import { optionalOptions, textOptions } from "$lib/options.js";
    import type { GuestForm } from "$lib/guest-form.js";

    let {
        form = $bindable(),
        detailed = false,
    }: { form: GuestForm; detailed?: boolean } = $props();

    // A value on file that isn't on the lodge's list (older records say
    // "Phone") is still offered, so the field shows what the record holds.
    function listed(values: string[], ...onFile: string[]) {
        const extra = onFile.filter((v) => v && !values.includes(v));
        return optionalOptions(textOptions([...values, ...new Set(extra)]));
    }
    const salutationOptions = $derived(listed(SALUTATIONS, form.salutation));
    const phoneTypeOptions = $derived(
        listed(PHONE_TYPES, form.phoneType, form.secondaryPhoneType),
    );
</script>

<div class="grid grid-cols-[90px_1fr] gap-3">
    <div class="space-y-1.5">
        <Label for="slt">Title</Label>
        <Combobox
            id="slt"
            bind:value={form.salutation}
            options={salutationOptions}
            placeholder="—"
        />
    </div>
    <div class="space-y-1.5">
        <Label for="fn">First name</Label><Input
            id="fn"
            bind:value={form.firstName}
        />
    </div>
</div>
<div class="space-y-1.5">
    <Label for="ln">Last name <span class="text-destructive">*</span></Label>
    <Input
        id="ln"
        bind:value={form.lastName}
        aria-invalid={!form.lastName.trim()}
    />
</div>
<div class="space-y-1.5">
    <Label for="ad">Address</Label><Input id="ad" bind:value={form.address} />
</div>
<div class="grid grid-cols-2 gap-3">
    <div class="space-y-1.5">
        <Label for="ci">City</Label><Input id="ci" bind:value={form.city} />
    </div>
    <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
            <Label for="rg">Prov</Label><Input
                id="rg"
                bind:value={form.region}
                maxlength={2}
            />
        </div>
        <div class="space-y-1.5">
            <Label for="pc">Postal</Label><Input
                id="pc"
                bind:value={form.postal}
            />
        </div>
    </div>
</div>
<div class="grid grid-cols-2 gap-3">
    <div class="space-y-1.5">
        <Label for="cn">Country</Label><Input
            id="cn"
            bind:value={form.country}
            maxlength={3}
        />
    </div>
    <div class="space-y-1.5">
        <Label for="ph">Phone</Label><PhoneInput id="ph" bind:value={form.phone} />
    </div>
</div>
{#if detailed}
    <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
            <Label for="ph-type">Phone type</Label>
            <Combobox
                id="ph-type"
                bind:value={form.phoneType}
                options={phoneTypeOptions}
                placeholder="—"
            />
        </div>
        <div></div>
        <div class="space-y-1.5">
            <Label for="ph2">Second phone</Label><PhoneInput
                id="ph2"
                bind:value={form.secondaryPhone}
            />
        </div>
        <div class="space-y-1.5">
            <Label for="ph2-type">Phone type</Label>
            <Combobox
                id="ph2-type"
                bind:value={form.secondaryPhoneType}
                options={phoneTypeOptions}
                placeholder="—"
            />
        </div>
    </div>
{/if}
<div class="space-y-1.5">
    <Label for="em">Email</Label><Input
        id="em"
        type="email"
        bind:value={form.email}
    />
</div>
