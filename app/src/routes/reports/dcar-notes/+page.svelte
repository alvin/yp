<script lang="ts">
    import ReportShell from "$lib/components/app/report-shell.svelte";
    import ReportFooter from "$lib/components/app/report-footer.svelte";
    import { dailyCashTabs } from "$lib/report-nav.js";

    let { data } = $props();
</script>

<svelte:head>
    <title>Notes on Daily Cash Activity Report</title>
</svelte:head>

<ReportShell
    title="Notes on Daily Cash Activity Report"
    backHref="/reports/dcar?date={data.date}"
    backLabel="Daily Cash"
    tabs={dailyCashTabs(data.date, "dcar-notes")}
    date={data.date}
>
    <div class="blackbar">Yellow Point Lodge</div>
    <h1>Notes on Daily Cash Activity Report, (DCAR):</h1>
    <p>
        The DCAR is basically the ‘till tape’ of the day’s transaction
        activity. As you can see from the sample, it is basically divided into
        two sections. The top portion lists all the sources of revenue and
        taxes retained, followed by balance sheet adjustments (<em
            >items that will change your actual cash on hand</em
        >) where deposits are recognized and applied, gift certificate sales
        noted, etc.
    </p>
    <p>
        We are in the practice of making a few manual adjustments to reflect
        staff tips and purchases plus any ‘extraordinary’ items. (<em
            >the sample shows $8.00 in staff tips, coded to ‘6025’</em
        >) The total of the top sections of the sheet must balance with the
        lower section, that lists all the payments we have received, by type.
    </p>
    <p>
        There is another series of related ‘appendices’ that provide full
        detail on things like deposits received and applied, items sold and
        things like that.
    </p>
    <p>
        There are portions of this report that we are hoping to eliminate,
        however. For example, our present system requires ‘pre-payments’ to be
        separate but we’d like to see if we can simplify this by just including
        those as ‘deposits’, which they basically are, etc.
    </p>
    <p>
        I won’t attempt to provide full detail here because this portion of the
        project will probably be amongst the most involved and we’ll have to do
        quite a bit of ‘back and forth’ to sort out things like recognizing
        deposits applied to check out bills and probably a few more head
        scratchers will present themselves.
    </p>
    <p>
        How we set up the ‘transaction’ portion of the Transaction Screen will
        be challenging and there may have to be a combination of codes and
        dates looked at in order to feed this report. More detail later,
        suffice it to say that we probably won’t be able to key all of this
        sheet from something like ‘departure day = today’. (<em
            >Please excuse me if it sounds like I’m trying to do your job, this
            may not be as big of a challenge to you as it appears to me.</em
        >)
    </p>
    <p>
        The sample will give you a good idea of what works for us now. We don’t
        mind the manual adjustments because at the end of the week, the daily
        reports are taken upstairs and entered into a matching spreadsheet
        manually. This gives a chance to really see what’s happening, catch
        errors, look for patterns and stay on top of our activity. If this
        report fed automatically into our Revenue Summary spreadsheets, errors
        could flow freely, we wouldn’t know about them for quite some time and
        they’d be difficult to trace.
    </p>
    <p>
        We are open to any and all suggestions, but wanted you to have an idea
        of what works for us at the moment.
    </p>
    <ReportFooter />
</ReportShell>
