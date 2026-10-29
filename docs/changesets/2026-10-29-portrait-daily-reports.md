# Changeset — the daily reports in portrait, reconciled with Access (round 17)

**Date:** 2026-10-29
**Trigger:** the client, on the Housekeeping Report, the In House Report, the Kitchen/Meal
Report and the Kitchen Report: *"make the text smaller, like prior updates"*, *"shift all
landscape reports listed here to portrait rather than landscape layouts, compacting things
accordingly as needed"*, and *"Remove the year from the date output to save space and ensure
dates are only on one line (just month and day as these are daily reports)"*. Then, report
by report: Housekeeping without Res #, with Room first; In House with the moves *"folded
right into the other 'In House' section"*; Kitchen/Meal without Res #, titled Daily; the
Kitchen Report without Res #, titled Weekly; then the Weekly Kitchen Report without its Guest
Diet column. Alvin then asked for the four reports to be
reconciled closely with how Access built them, since the lodge is anchored on it (§6).
**State:** `npm run check` and `npm run build` clean, every feature test and
`business_logic_smoke.sql` passing. `0032` applied to the local stack, then to the hosted
project just before the push.

---

## 1. Portrait, smaller, closer

**Shipped.**
- The Housekeeping, In House and Kitchen/Meal routes drop `orientation="landscape"`, so they
  print on letter portrait. The 7-day kitchen report already did. In the batch print run the
  three lose their `landscape` class. The batch had always printed them portrait (one
  `@page` per print action), so now a report prints the same way alone or in the batch.
  The batch's landscape caption width is gone, and its group heading is the pages' 980px.
- `report.css`: a `table.compact` class, used by the four reports, sets 12px type, one step
  below the 14px every report got on 28 Oct, with 3px 4px cells instead of 5px 6px. In
  these tables the headers and every cell except the guest's name (`td.guest`) and the notes
  (`td.note`) stay on one line. A room ("Field Cabin: 25") or a status ("Arrive Today")
  broken over two lines doubled its row's height on the narrower sheet.
- Checked by printing each report for 17 Jul 2026 (107 rooms, 38 diets, 7 moving parties)
  from the local stack: every table fits the portrait sheet's width.

**Judgement calls.**
- **Smaller means 12px,** one step, like the last change. Headings and the black bar keep the
  originals' sizes.
- **Only the four named reports.** The Manual Sales List, Cancellation List, Requests reports
  and cash reports keep 14px. The Requests report is also landscape but wasn't named, so it
  stays landscape.

**To back out:** restore `orientation="landscape"` on the three routes and the `landscape`
class in the batch, and remove `table.compact` from `report.css` and the four tables.

## 2. Dates without the year

**Shipped.** `dayMonth()` in `format.ts` prints "17-Jul": the lodge's dd-MMM-yy without
the year. The In and Out dates on Housekeeping and In House and the arrival and departure
dates on both kitchen reports use it. The headings keep the full date: "for 17-Jul-26",
"Arrival Date between 17-Jul-26 and 23-Jul-26".

**Judgement calls.**
- **"17-Jul", not "Jul 17",** so the dates read as the rest of the lodge's paperwork does.
- **The heading keeps its year.** It's one line that names the sheet's day.
- **A housekeeping note's date keeps its year** ("23-Dec-23"). It's the day the note was
  written, which is often an earlier stay: the lodge's own sample for 23-Dec-25 prints notes
  dated 23-Dec-23 and 23-Dec-24. Without the year they'd read as this week's. The client's
  reason for dropping the year ("these are daily reports") holds for the stay dates, not for
  this one.

**To back out:** `dateShort` in place of `dayMonth` in the four reports; to drop the
year from the note date or the heading too, `dayMonth` there.

## 3. Housekeeping: Room first, no Res #

**Shipped.** The columns are Room, Status, Guest, Count, In, Out, Note Date, Notes. The
order of the rows (lodge room order) is unchanged. The report ends on Total Guests (§6).

**To back out:** restore the two columns' order in `housekeeping-body.svelte`.

## 4. In House: moves under In House

**What was going on.** Since `0013` the report gave a moving party two sections of its own,
Move In and Move Out, between Arrive Today and In House. Access never did:
`qryReportInHouseOccupancy2` labels a line Arrive Today or Depart Today from the
reservation's own dates, and In House otherwise, so both rooms of a mid-stay move read In
House.

**Shipped.** `0032_in_house_folds_in_moves.sql` recreates `report_in_house` with Move In
and Move Out reported as In House, sorted by guest and then by the day the room was taken,
so the room a party leaves sits directly above the one it moves into. `in-house-body.svelte`
has three sections: Arrive Today, In House, Depart Today. `occupancy_status` is unchanged,
and the housekeeping report still marks the two rooms Move Out and Move In, as Access's
housekeeping query did.

**Judgement call — no marker on a move's lines.** Their dates show it: the room left is Out
on the day, the room taken is In on the day. Access printed them the same way.

**To back out:** restore `report_in_house` from `0030` and the five-section `ORDER` in
`in-house-body.svelte`.

## 5. The kitchen reports: titled Daily and Weekly, no Res #

**Shipped.** "Daily Kitchen/Meal Report": Guest, Arrival Date, Departure Date, the diet and
notes. "Weekly Kitchen Report": Last Name, First Name, Kitchen/Meal Notes, Arrive, Depart;
the Guest Diet column is gone too. Which stays the report lists is unchanged. The title bar
above each report and the batch's caption use the new titles.

**Judgement calls.**
- **"Daily" and "Weekly" go in front** of the existing titles.
- **The Print Center's names and the report tabs are unchanged** ("Kitchen / dietary",
  "Kitchen — 7-day range", "Kitchen / meals", "Kitchen (filtered)").

**To back out:** restore the two `<h1>`s, the two shell titles and the batch caption, and the
Res # and Guest Diet columns.

## 6. Reconciled against Access

Each report was checked against its Access definition in
`legacy-db/YPLogicCurrentConsolidated.accdb` (record sources with `mdb-queries`; the report
footers' expressions read from the report objects' stored text) and against the lodge's
printed samples for 23-Dec-25 in `original_spec/reports/`.

**What already matched.**
- *In House:* the same 48 rooms as the sample, with the same sections and guest counts, and
  the same order within each section (by guest). Names differ only where the sample's narrow
  column cut them off or a guest record was edited since.
- *Housekeeping:* the printed report read `qryReportHousekeepingOccupancy2`, sorted by room
  order, with the five statuses in the same priority as `occupancy_status`; ours matches the
  sample page row for row. `qryReportHousekeepingOccupancy4`, which moves six rooms (Boathouse,
  Parsonage, Three Oaks) up the list, isn't the report's source, so the order isn't changed.
- *Kitchen/Meal:* the same 13 stays as the sample, in the same order.

**Changed to match Access (`0032` and the app).**
- **The In House arrival time** prints on arriving stays only, as Access's
  `IIf([ResArrivalDate]=StartDate, [ResArrivalTime], "")` did. It printed on every line, so
  #108688's "Before Lunch" showed on the day it left.
- **The In House summary figures are guests, not lines.** Access summed each section's
  `OccupancyNumGuests` (19, 22 and 28 on the sample, from 10, 15 and 23 lines). Ours counted
  lines.
- **The In House Total Guests is Arrive Today plus In House.** Access's footer:
  `DSum(... "[Status] = 'Arrive Today'") + DSum(... "[Status] = 'In House'")`, with the note
  "Arrivals + In House": 47 on the sample. Ours used `guests_in_house`, which adds the
  departing guests: 70 for that day.
- **Housekeeping ends on Total Guests, as Access's did.** Access's report footer had one, with the note
  "Total Guests does not include 'Depart Today'". The sample is page 1 of 4, so the clone
  never showed it. Ours prints the same figure as the In House report's.

`in_house_counts(p_date)` returns the four figures. For 23-Dec-25 it gives 19, 22, 29 and
48 against the sample's 19, 22, 28 and 47. The one guest is #108703's room, which has no
guest count on the sample and a count of 1 in the March Access copy (a blank count imports
blank, as KERLIN's shows), so it was filled in after printing.

**Where we still differ from Access, and why.**
- **A party moving rooms is counted once,** in the room it moves into. Access put both rooms
  under In House and summed both, so it counted the party twice. Kept from `0013`.
  *To back out:* count `'Move Out'` in `in_house_counts.in_house`.
- **The In House sections run Arrive Today, In House, Depart Today.** Access grouped by status
  alphabetically (Arrive, Depart, In House). The lodge asked for this order on 17 Sep
  ("Header = 'Arrivals' … print header = 'In House' … etc.").
- **Housekeeping's Total Guests counts the rooms' guests,** like the In House report's, where
  Access's housekeeping footer summed the bookings' "# Guests" (`NumAdults`), so its two
  reports could disagree. Since 9 Oct the number-of-guests pen keeps the two in step.
- **The Kitchen/Meal Total Guests isn't Access's.** Access's footer is
  `=DSum([NumAdults],"qryReportKitchenMealOccupancy2")`, with the field not quoted, so Access
  takes the last line's party size (2) and adds it once per booking. It printed 88 on the
  sample, 2 × 44 bookings, when about 70 guests were at the lodge. Ours keeps
  `guests_in_house`: everyone at the lodge that day, departing guests included, which is what
  the query behind Access's figure selects.
- **A housekeeping note prints on its own stay's line.** On the sample, #108681's note
  ("TWIN BEDS NEEDED…", Lodge 05, departing) printed on the arriving #114395's line in the
  same room. Ours prints it on #108681's line.

**To back out:** restore `report_in_house` from `0030`, drop `in_house_counts`, and return
the In House body and loaders to `guests_in_house` and line counts; drop the housekeeping
Total Guests line.

## Stories

`print-housekeeping-report`, `print-in-house-occupancy-report`, `print-full-meal-report`,
`print-filtered-kitchen-report-for-selected-date` and `print-daily-operations-reports` take
the new criteria, and their tests assert them. `show-an-accurate-room-status-for-the-day`
loses "The In House report prints Move Out beside Move In"; the In House story now covers
where a move prints, so the two stories don't both describe it.
