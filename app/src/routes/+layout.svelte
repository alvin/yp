<script lang="ts">
    import "../app.css";
    import { page } from "$app/state";
    import PrinterIcon from "@lucide/svelte/icons/printer";
    import CalculatorIcon from "@lucide/svelte/icons/calculator";
    import PlusIcon from "@lucide/svelte/icons/plus";
    import Brand from "$lib/components/app/brand.svelte";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Toaster } from "$lib/components/ui/sonner/index.js";
    import LogOutIcon from "@lucide/svelte/icons/log-out";
    import { goto } from "$app/navigation";
    import { dateMed } from "$lib/format.js";
    import { TODAY } from "$lib/data/queries.js";
    import { supabase } from "$lib/data/client";

    let { children } = $props();

    // Report routes render their own full-page paper shell with print controls;
    // the sign-in screen renders without app chrome.
    const bare = $derived(
        page.url.pathname.startsWith("/reports") ||
            page.url.pathname === "/login",
    );

    async function signOut() {
        await supabase.auth.signOut();
        await goto("/login");
    }
</script>

<Toaster position="top-center" />

{#if bare}
    {@render children()}
{:else}
    <div class="flex min-h-screen flex-col">
        <header
            class="sticky top-0 z-30 border-b bg-background/90 backdrop-blur"
        >
            <div
                class="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6"
            >
                <Brand />
                <div class="flex items-center gap-1.5">
                    <span
                        class="text-muted-foreground mr-1 hidden text-xs font-medium sm:inline"
                    >
                        Today · {dateMed(TODAY)}
                    </span>
                    <Button variant="ghost" size="sm" href="/reservations/new">
                        <PlusIcon />
                        <span class="hidden sm:inline">New reservation</span>
                    </Button>
                    <Button variant="ghost" size="sm" href="/print">
                        <PrinterIcon />
                        <span class="hidden sm:inline">Print Center</span>
                    </Button>
                    <Button variant="ghost" size="sm" href="/reports/dcar">
                        <CalculatorIcon />
                        <span class="hidden sm:inline">Daily Cash</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        title="Sign out"
                        onclick={signOut}
                    >
                        <LogOutIcon />
                    </Button>
                </div>
            </div>
        </header>

        <main
            class="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 sm:py-8"
        >
            {@render children()}
        </main>

        <footer class="border-t py-4">
            <div
                class="text-muted-foreground mx-auto flex max-w-[1200px] items-center justify-between px-4 text-xs sm:px-6"
            >
                <span>Yellow Point Lodge · Front Desk</span>
                <span>61 rooms · Vancouver Island</span>
            </div>
        </footer>
    </div>
{/if}
