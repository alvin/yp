# Changeset — refund tender, cancellation notes, and the Cancellation List (round 16)

**Date:** 2026-10-28
**Trigger:** the lodge reported a double refund: a deposit refunded by hand from the
Payment dialog (category Deposit (Refund), to choose a different tender), then the
reservation cancelled with "Refund the deposit". After cancelling and un-cancelling, the
second refund was no longer offered. They asked for the tender type to be chosen in the
cancel dialog's Deposit handling, so the workaround isn't needed.
Then, from Alvin and Richard's marked-up Cancellation List: the note typed when cancelling
must not mix with the occupancy notes (on un-cancelling, #114808's "the bad thing happened"
stayed on its room) and belongs in the reservation notes, the list printed the wrong notes, it should cover a range of days rather
than one, and reports should set smaller text with dates that don't wrap (§5–7). Last,
occupancy notes off the cancellation notice (§8), and the client's "could you remove the
'requests' notes from the 'In House' list" (§9).
**State:** `npm run check` and `npm run build` clean, every feature test and
`business_logic_smoke.sql` passing. `0027` and `0028` applied to the local stack and, on
2026-10-28, to the hosted project in one `begin … commit` (its functions checked against the
local stack's by `md5(prosrc)`), just before the app's push to `main` (`1103d83`). `0029` and
`0030` followed the same way later that day, before the second push.

---

## What was going on

Checked against the hosted data (read-only) and reproduced on the local stack.

- **The database never wrote a second refund.** `cancel_reservation` refunds only when
  `reservation_deposit_held > 0`, and a hand-entered `Deposit (Refund)` brings that to zero.
  #115047 and #108110, cancelled on 28 Oct after hand refunds, carry no "Deposit refunded on
  cancellation" line. The hosted functions match the local ones (`md5(prosrc)`).
- **The screen was stale.** `reservation-ledger.svelte` reloaded only its own lines after a
  payment, so the page's `s.deposit_held` (from `v_reservation_summary`) still held the
  old figure. The Cancel dialog showed "Deposit on file $70" with "Refund the deposit"
  selected. Cancelling refunded nothing, but the toast said "Deposit (Refund)". Opening the
  reservation again loaded fresh data, and the dialog showed "No deposit on file". That's
  the out-of-sync status the lodge noticed. It also left **Settle deposit** showing after a
  hand refund on a cancelled stay; clicking it raised "holds no deposit".
- **A real gap: `record_payment` didn't cap a deposit refund.** A refund larger than the
  deposit, or one entered after cancelling had already refunded it, was accepted. #108110
  had a $70 Cheque refund against a $35 deposit (since removed by staff).

## What shipped

- `0027_refund_tender_on_cancelling.sql`
  - `reservation_deposit_tender(p_reservationid)`: the tender of the latest live deposit
    received, which the dialogs offer first.
  - `settle_deposit(…, p_paymenttype)` and `cancel_reservation(…, p_paymenttype)`: a refund
    goes out on the tender given, or on the deposit's own without one. A kept deposit stays
    on the deposit's tender. Both are dropped and recreated, since the new trailing parameter
    would otherwise overload the old signature.
  - `record_payment`: a `Deposit (Refund)` larger than `reservationguest_deposit_held`
    raises "The deposit held is $X; a refund cannot be more".
- Cancel dialog and Settle deposit dialog: a **Tender type** combobox, shown only when the
  handling is a refund, starting on `data.depositTender`. Its label matches the Payment
  dialog's.
- `reservation-ledger.svelte`: a charge, payment, quantity change or removal reloads the
  page (`invalidateAll`), not just the ledger lines, so the deposit figure, the Settle
  deposit button and the dialogs agree with the database. The unused `reservationid`
  prop is gone.
- Story `handle-deposits-on-cancellation.feature`: refund tender, the dialog reflecting a
  payment just recorded, and no deposit refunded twice. Its test covers each, through the
  database and the screen.

No existing UI string changed.

## Judgement calls

- **Deposit (Refund) stays in the Payment dialog.** Access has a handful of deposit refunds
  on stays that weren't cancelled (partial refunds), and only the cancel and settle dialogs
  refund otherwise. With the cap, the hand route can't double-refund.
  *To back out:* filter `'Deposit (Refund)'` out in `paymentCategoryOptions`
  (`app/src/lib/options.ts`), like the Applied categories.
- **The cap is per guest on the stay** (`reservationguest_deposit_held`), the level the
  payment is recorded at; with one guest per stay this is the stay's deposit.
- **The refund tender isn't restricted** to the deposit's tender or to refundable tenders;
  every tender in `lookup_payment_types` is offered, like the Payment dialog.

## To back out

Restore `settle_deposit` and `record_payment` from `0022`/`0005`, `cancel_reservation` from
`0026` (drop the five-argument forms first), and drop `reservation_deposit_tender`. Revert
the two dialogs, `+page.svelte`/`+page.ts`, the two data functions, and
`reservation-ledger.svelte`'s `reload`.

---

## 5. The cancellation note joins the reservation notes

> *"Notes printed were not the notes made in the 'cancellation' prompt."*

**What was going on.** Since `0026` the note typed when cancelling joined the first room's
occupancy notes, so the notice could still print it once reservation notes went office-only.
Occupancy notes also print on the confirmation and the In House report, and un-cancelling
left the note on the room. #114754 on the hosted system shows both problems. Its room reads
"switched from L#7 as per request\nMom crashed her plane, has sore foot." (the second line
was typed when cancelling). Its Cancellation List row printed only the reservation notes,
"switched w/Lewis Casey…", because `report_cancellation_list` reads `resnotes`.

**First attempt, withdrawn the same day.** A separate `rescancellationnotes` field, cleared
on un-cancel. After talking to the office, Alvin asked for no new field: the note goes into
the reservation notes, as before `0026`, and un-cancelling leaves it there. It never reached
the hosted project.

**Shipped.** `0028_cancellation_notes_and_list.sql`: `cancel_reservation` adds the typed
note to `resnotes` on a line of its own (`concat_ws`), for every stay, and no longer touches
occupancy notes. The Cancellation List prints `resnotes`, so it carries the note. The notice
is unchanged from `0026`: occupancy notes only, never the reservation's notes (and from
`0029`, no notes at all; §8). Un-cancel
leaves `resnotes` alone. Its toast reads "Reservation notes unchanged." with an **Edit
notes** action that opens the Reservation notes dialog, shown only when the stay has notes.

**Against Access** (`legacy-db/YPLogicCurrentConsolidated.accdb`, checked 28 Oct).
`rptCancellationSlip` (the Access print screen's "Cancellation Report:" button; our
cancellation notice) ran for today's cancellations or one booking, and printed `ResNotes`
with the room and payment subreports. The lodge's sample #109050 notice prints its ResNotes
word for word. `rptCancelledReservation` took the menu's start and end dates and listed
each cancelled booking's payments, with no notes. A saved query, "MTHENDCXL'S", did the same
at month end. Access had no list that printed notes. Our Cancellation List dates from the
first build. So: the reason lives in the reservation notes, as in Access; it is reviewed
over a range, as in Access; un-cancelling leaves it, as in Access. One departure: it
prints on the list, not on the guest's notice, which keeps the lodge's 25 Oct request that
reservation notes print on nothing a guest sees. Alvin chose that over printing every
reservation note on the notice, as Access did (28 Oct, confirmed with the office).

**Judgement calls.**
- **The cancel dialog's label changed** from "Cancellation note (prints on the notice)" to
  "Cancellation note (prints on the cancellation report)". The note no longer prints on the
  notice, so the old label would have been wrong.
  *To back out:* restore the label (and, for the notice to print it, add
  `resnotes` back to `report_cancellation_notice`).

- **Notes already written into occupancy notes by cancelling stay where they are.**
  Migrations don't change data, nothing marks which lines came from cancelling, and on the
  hosted system they're all test bookings that the go-live import replaces. Staff can
  delete one on Notes for reports → Occupancy.

## 6. The Cancellation List covers a range of days

> *"Don't need 'daily' report, is 'date range' possible? (add date range gate)"*

**Shipped.** `report_cancellation_list(p_from, p_to)` replaces `(p_date)`. It lists stays
cancelled in the range, sorted by day cancelled and then guest. The report has From and To
pickers, like the 7-day kitchen report, and a **Cancelled:** column. Its heading reads
"Cancelled between … and …", and the empty line reads "No cancellations in these dates."
It's no longer among the daily reports' tabs. In the Print Center it takes the Report date
and the optional End date. Without an end date it covers the week ending on the report date.
Its description reads "Cancelled in a date range".

**Judgement calls.**
- "Date range selector" uses the From/To pickers the kitchen range report already has, not
  a list of preset ranges. The default (the week ending on the date) looks back, because
  cancellations are reviewed after the fact.
- The **Cancelled:** column is new. With more than one day on the sheet, each row needs
  its date.

## 7. Smaller report text; dates don't wrap

> *"Maybe widen 'Arrival' column to keep year"* (Alvin: smaller text across the reports, no
> wrapping of dates)

**Shipped.** In `report.css`, every report that opens on the black bar sets its tables at
14px instead of 16px. The guest documents (confirmation, folio, bill, notice) keep the
originals' sizes. A date cell (`td.date`, on every report date column) doesn't break at the
hyphens in "27-Oct-26". Richard's "year in bold" is struck through on the sheet, so it isn't
done.

**To back out:** remove the `.date` and `:has(.blackbar) table` rules from `report.css`.

## 8. No occupancy notes on the cancellation notice

> *"Do the occupancy notes go onto the cancellation folio? They shouldn't."* (Alvin, 28 Oct,
> after the office tried the deploy)

**Shipped.** `0029_no_notes_on_the_cancellation_notice.sql` recreates
`report_cancellation_notice` without `occupancy_notes`. The notice prints the booking, its
dates, room and party, and the deposit, and no notes at all. The notice body drops the
paragraph, and the Occupancy tab's helper line now reads "Prints on the in-house report and
the confirmation." This reverses the 25 Oct chart's "print to the Cancellation folio" for
Occupancy. Those notes are messages for a guest who is coming.

**To back out:** restore `report_cancellation_notice` from `0026`, the paragraph in
`cancellation-notice-body.svelte`, the `occupancy_notes` field on `CancellationReport`, and
the helper line.

## 9. Requests off the In House list

> *"could you remove the 'requests' notes from the 'In House' list"*

**Shipped.** `0030_in_house_without_requests.sql` recreates `report_in_house` with
`occupancy_notes` as the room's occupancy notes alone. Since `0014` it had joined them with
the guest's requests (`rgnotes`). The column was already headed "Occupancy Notes:". Requests
still print on the confirmation and the two Requests reports. The Requests tab's helper line
now reads "Prints on the requests reports and the confirmation."

**Against Access.** `qryReportInHouseOccupancy2` reads `OccupancyNotes` and no `RGNotes`, so
this matches Access again.

**To back out:** restore `report_in_house` from `0014` and the helper line.

## Back out §5–6

Restore `cancel_reservation` from `0027` and `report_cancellation_list(date)` from `0003`.
Revert the list route, `opsTabs`, the Print Center entry, the cancel dialog's label and the
un-cancel toast.
