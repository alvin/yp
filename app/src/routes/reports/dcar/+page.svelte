<script lang="ts">
    import ReportShell from "$lib/components/app/report-shell.svelte";
    import ReportFooter from "$lib/components/app/report-footer.svelte";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { dateLong, dateShort, money } from "$lib/format.js";
    import { dailyCashTabs } from "$lib/report-nav.js";
    import type { DcarUpperRow } from "$lib/data/types.js";

    let { data } = $props();

    const balanced = $derived(Math.abs(data.summary.balance_owed) < 0.005);

    // Printed labels must match the client's original sheet exactly:
    // tax rows (and the two upper totals) carry a trailing colon, and the
    // RPC's 'Hotel Tax' line prints as 'Other Tax:'. Revenue items and
    // adjustment categories print as-is, with no colon.
    function upperLabel(row: DcarUpperRow): string {
        if (row.group_name === "Taxes") {
            return row.item === "Hotel Tax" ? "Other Tax:" : `${row.item}:`;
        }
        if (row.item === "Total Sales and Charges")
            return "Total Sales and Charges:";
        return row.item;
    }
</script>

<svelte:head>
    <title>Daily Cash Activity · {dateShort(data.date)}</title>
</svelte:head>

<ReportShell
    title="Daily Cash Activity Report"
    backHref="/"
    backLabel="Lookup"
    tabs={dailyCashTabs(data.date, "dcar")}
    date={data.date}
>
    {#snippet toolbar()}
        {#if balanced}
            <Badge variant="success">Balanced ✓</Badge>
        {:else}
            <Badge variant="warning">
                Difference {money(data.summary.balance_owed)}
            </Badge>
        {/if}
    {/snippet}

    <div class="blackbar">Yellow Point Lodge</div>
    <h1>Daily Cash Activity Report for {dateLong(data.date)}</h1>
    <table>
        <thead>
            <tr>
                <th>Item:</th>
                <th>Amount (Cdn):</th>
                <th>Adjustments:</th>
            </tr>
        </thead>
        <tbody>
            {#each data.upper as row (row.group_name + "|" + row.item)}
                <tr>
                    <td>{upperLabel(row)}</td>
                    <td>{money(row.amount)}</td>
                    <td></td>
                </tr>
            {/each}
            <tr>
                <td>Today's Revenue and Expenses:</td>
                <td>{money(data.summary.upper_total)}</td>
                <td></td>
            </tr>
        </tbody>
    </table>
    <h3 style="text-align: left">
        Type of Cash:
        <span class="small" style="background: #111; color: #fff; padding: 3px 6px"
            >All US amounts converted to Cdn</span
        >
    </h3>
    <table>
        <thead>
            <tr>
                <th>Type of Cash:</th>
                <th>Calc. Amt (Cdn):</th>
                <th>Actual Amount:</th>
                <th>Adjustments:</th>
            </tr>
        </thead>
        <tbody>
            {#each data.payments as p (p.paymenttype)}
                <tr>
                    <td>{p.paymenttype}</td>
                    <td>{money(p.calc_amount)}</td>
                    <td></td>
                    <td></td>
                </tr>
            {/each}
            <tr>
                <td>Total Receipts Today:</td>
                <td>{money(data.summary.receipts_total)}</td>
                <td></td>
                <td></td>
            </tr>
            <tr>
                <td>Balance Owed:</td>
                <td>{money(data.summary.balance_owed)}</td>
                <td></td>
                <td></td>
            </tr>
        </tbody>
    </table>
    <ReportFooter />
</ReportShell>
