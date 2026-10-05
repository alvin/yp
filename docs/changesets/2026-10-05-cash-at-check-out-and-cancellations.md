# Changeset — the cash sheet at check-out, cancellations, the pen (round 12)

**Date:** 2026-10-05
**Trigger:** the lodge's latest round of feedback: the kept deposit's sign, un-cancelling,
a "pending" deposit, the cancellation slip on active bookings, the deposit missing from the
cash sheet, and a pen to change a charge's quantity.
**State:** `npm run check` clean, every feature test and `business_logic_smoke.sql`
passing. `0021` and `0022` applied to the local stack and, on 2026-10-05, to the hosted
project (in one `begin … commit`, before the app was pushed).

The owner approved the plan on 2026-10-05: a kept deposit lands as revenue on its own
*Cancellation* line, and the new words are Un-cancel, Decide later, Settle deposit and
Change quantity.

---

## 1. The cash sheet counts a stay on the guest's check-out day

> *"When I called up the cash sheet, the $1,000 'deposit received' was showing, but there
> was not '$1,000 deposit applied' on the sheet … the charges at the top of the sheet will
> only match the payments at the bottom of the sheet if the deposit is deducted and shown
> as 'deposit applied'."*

**What was wrong — more than the deposit.** The app put each charge on the sheet the day it
was posted and never applied a deposit. Access did neither:

- `qrySubreportDailyCashSalesCharges` and `qrySubreportDailyCashTaxes` select
  `CheckOutDate = the report date` — a stay's charges reach the sheet the day the guest
  checks out, which is the day they pay (13,234 of 13,236 regular payments since 2024 were
  taken on the check-out day).
- At check-out the clerk applied the deposit by hand: `qryAppendReservationPayment` wrote a
  Deposit (Applied) line dated that day, `qryUpdateReservationPayment` set the deposit line
  to $0.00, and the sheet took the applied amount off the day's total.
- What settled a bill without money changing hands (codes D02, D04, P02, AR1, PR2) stayed
  out of the receipts by type of cash (`qrySubreportDailyCashType`).

So the top and bottom of our sheet met only on a day when a stay was booked, charged and
paid at once. Across 2025 it balanced on 10 days of 365, out by $9,113 on an average day.
On 15 Dec 2025 — the date of the original sheet in `original_spec/reports/` — it was out
by $7,062.64.

**Shipped** (`0021_cash_at_check_out.sql`, all in the database):

- `charges_cashed_out(p_date)` — a stay's charges and taxes count on its check-out day; a
  charge posted after its stay's check-out day counts the day it is posted.
- `applied_at_check_out(p_date)` — whatever deposit or prepayment a stay still holds
  (received, less refunded and kept) is applied on its check-out day: the sheet's
  Deposit (Applied) / Prepayment (Applied) lines take it off the total and the Deposits
  Applied appendix lists each stay. Cancelled stays are never applied.
- `payment_moves_money(category)` — applied, kept, gift certificate received and sent to
  accounts are taken off the top section and kept out of the receipts and the Cashier
  Detail.
- The sheet's two totals are now the sums of their own lines (`report_dcar_total`,
  `report_dcar_receipts_total`), so a line and its total can't disagree.
- Items Cashed Out reads `charges_cashed_out`, so it agrees with the sheet.

**Verified on the full data, local and hosted alike:** 216 days of 2025 balance to the cent,
88 are out by cents of tax rounding, 56 by exactly what departing guests still owed that
day (a $17,638.61 group bill sent to accounts on 25 Apr and paid 10 May — what Balance
Owed is for), and 5 are oddities. 15 Dec 2025 balances, and reproduces the original
sheet's Room $455.00, Room Tax $21.84, Dest Mktg Tax $5.46, Deposit (Refund) −$52.00 and a
$70.00 Deposits Applied line for #115540 HOEFER. Its other figures can't be reproduced:
Access later set the day's deposit lines to $0.00 as they were applied, and deleted the
daily sales accounts' lines each night. Each report runs in under 20 ms.

**Judgement call — applied by the database, not by a clerk.** No step at the desk, nothing
to forget, and the deposit line keeps its amount, so the day it was received still reads
as it did — Access rewrote that history. The Payment dialog and the booking screen's
charges panel no longer offer Deposit (Applied) or Prepayment (Applied), so nothing can be
applied twice. Stays imported from Access carry their clerk's applied line; the larger of
that and what is still held counts, so none counts twice.

**Judgement call — charges posted after check-out count the day they are posted.** Access
re-dated its daily sales accounts to the next day every night (`qryUpdateReservationDates`)
and cleared their lines (`qryDeleteDailySales*`), so walk-in sales always fell on the day.
Nothing re-dates them here; this rule covers them, and catches a late charge, which Access
never counted at all.

**Judgement call — deductions print with a minus sign.** The original sheet printed
Deposit (Applied) as $70.00 and subtracted it. Ours prints −$70.00, as refunds always
printed, so the column adds up to its total — the cash-sheet story says the lines add up
to the totals. If the lodge's bookkeeper would rather see them unsigned, the sign is in
`report_dcar_upper`.

**Judgement call — gift certificates and bills sent to accounts.** They settle a bill without
money changing hands, exactly like an applied deposit, so they follow the same rule; without
it a check-out paid partly by gift certificate could not balance. Their tender types (Gift
Certificate, None (Sent to A/R)) no longer print as receipt lines unless a receipt was filed
under one. Paid Out and Donation are money and stay as they were.

**Consequences worth knowing:**
- A guest who pays before the check-out day with a regular payment unbalances that day and
  the check-out day, as in Access, where money taken early was a deposit or prepayment.
- A stay left uncancelled after a no-show has its deposit applied on its check-out day with
  no charges: Balance Owed goes negative that day, which is the prompt to cancel it.
- **Before switchover:** the hosted data is the 28 March 2026 Access copy. 2,852 stays have
  checked out since in Access with deposits ($164,325) still recorded here as held, so each
  of those days' sheets shows deposits applied with nothing to match. The go-live import
  brings them current.

**Not changed:** the US lines, Paid Out, Donation, the appendices' layouts.

**To back out:** restore `report_dcar_upper` and `report_dcar_payments` from `0014`,
`report_dcar_total`, `report_dcar_receipts_total` and `report_cashier_detail` from `0003`,
`report_deposits_applied` and `report_items_cashed_out` from `0005`; drop
`charges_cashed_out`, `applied_at_check_out` and `payment_moves_money`; revert the two
appendix loaders and `paymentCategoryOptions`.

---

## 2. A kept deposit nets the cancelled stay to zero

> *"When I cancelled a reservation with a $35.00 deposit … the $35.00 'deposit kept' as a
> credit, too … Perhaps the 'kept' should be a positive number since we are actually
> 'charging' them for the cancellation."*

**Shipped.** `payment_balance_effect` counts a Deposit (Kept) line like a charge, so the
stay comes to $0.00 — Richard's own test booking, #107418, included. On the cash sheet the
kept amount is that day's revenue on a **Cancellation** line among the sales, and comes off
as Deposit (Kept), because the money came in earlier as a deposit. No card or cash line
moves.

**Why "it worked" before.** The sheet added the kept $35 to the top and to the Visa line —
balanced, but the Visa line then disagreed with the card machine by $35.

**Legacy evidence.** Access had no balanced way to show a kept deposit with a value (D04 was
subtracted, with nothing to offset it): every one of its 630 Deposit (Kept) lines is $0.00,
the amount at most typed in a note ("$35 kept"). No real line changes meaning; the two
non-zero ones in the local data are our own test fixtures.

**To back out:** restore `payment_balance_effect` from `0003`; drop the Cancellation line
from `report_dcar_upper`.

---

## 3. Un-cancel

> *"They are wondering if there is a simple way to 'un-cancel' a reservation? … if the
> 're-book' function could be tweaked to use the existing 'cancelled' dates, they might
> like it."*

**Shipped.** `uncancel_reservation`; **Un-cancel** takes Cancel's place on a cancelled
reservation. The booking stands again as it was — number, dates, rooms, guests — and the
reservations trigger clears the cancellation date, so it leaves that day's cancellation
report. A deposit refunded or kept on cancelling stays as recorded; one decided later is the
stay's deposit again. Story `un-cancel-a-reservation.feature`.

**Judgement call — un-cancel, not re-book.** Access staff un-cancelled in place ("Called and
uncancelled the room … to not lose dep.", "reinstated reservation"), keeping the number on
the guest's confirmation and the deposit on the stay. Re-book stays next year's reservation
(round 2) rather than taking a second meaning for cancelled stays.

**Not changed:** a cancellation note appended to the reservation notes stays there, and
prints on the confirmation; the desk edits it on the Reservation tab if needed.

**To back out:** drop `uncancel_reservation` and the button.

---

## 4. Decide later, then settle the deposit

> *"Often, people will cancel, but we'll wait and see if we rent their space out, then we'll
> refund their deposit … could we have 'pending' that sends a '0.00' value to the
> transaction screen? … Only at that time is the cash sheet impacted."*

**Shipped.** With a deposit on file the cancel dialog offers **Decide later** beside Refund
and Keep (with none it still reads "No deposit on file"). The deposit stays held on the
cancelled stay and shows in the date search's Deposit column beside the red Cancelled badge.
**Settle deposit** on that reservation refunds or keeps it, dated that day, which is when
the cash sheet sees it. `settle_deposit` is the refund/keep half of `cancel_reservation`,
which now calls it; it refuses a stay holding no deposit.

**Judgement call — no $0.00 placeholder line.** That was the Access workaround (the lodge's
notes carry "$70 dep ref only if accom/upg rent" on 187 bookings). Leaving the deposit held
is the same state without a line to remove and replace.

**To back out:** remove the Decide later option, the Settle deposit button and dialog; drop
`settle_deposit` after restoring `cancel_reservation` from `0005`.

---

## 5. The cancellation slip only for a cancelled booking

> *"Also, the 'cancellation slip' is printable at anytime, even when a reservation is still
> active … could it only be active if the little red 'cancelled' indicator is displayed?"*

**Shipped.** `report_cancellation_notice` returns nothing for an active reservation, so the
notice can't print for one from any path; the reservation's Print card and the document tabs
offer Cancellation only once the stay is cancelled (`guestDocTabs(…, cancelled)`). Criterion
added to `render-and-print-cancellation-notice.feature`.

**To back out:** drop `and s.rescancelled` from `report_cancellation_notice` and the
`cancelled` argument from `guestDocTabs`.

---

## 6. The pen: change a charge's quantity

> *"Is there a way to make the quantity of a charged item editable after the fact? … could
> transactions have the little 'pen' in addition to the little 'trash can'?"*

**Shipped.** A pen beside each charge line's garbage can opens **Change quantity**.
`change_charge_quantity` keeps the price per unit the line was posted at (a price typed over
the list price stays), the transactions trigger recomputes the taxes, and on a room line the
quantity is nights and the nights it covers follow. A quantity under one is refused. Payment
lines have no pen. Story `change-the-quantity-of-a-charge.feature`.

**Background.** Round 1 recorded this as the feature to build if the lodge asked to fix a
line rather than remove it: Access did it with `frmUpdateQuantityOptions`,
`frmChangeAmountInventory` and `frmChangeAmountRoom`, and 36% of its liquor lines carry a
quantity over one. With item 1 in place, tidying a tab before check-out changes no sheet
already printed — the answer to Richard's aside, *"I'm assuming they'll only show on the
cash sheet once a 'payment type' is entered."*

**To back out:** remove the pen and dialog; drop `change_charge_quantity`.

---

## Not asked for, but changed

- **The transactions panel follows the page.** It kept the lines it opened with, so a refund
  written by cancelling didn't show until the page was reloaded. It now follows the page's
  data (`$derived`), so cancelling, settling and un-cancelling show at once.
- **The Deposits Applied check.** Its "Agrees with Daily Cash" badge compared against the
  sheet's line, which is now negative; it compares against the amount taken off. The
  balance-check test covered one appendix and now covers all four, which is how this was
  caught.
- **Stories brought into step:** deposits on cancellation, the cash sheet and its
  adjustments, deposit classification, tender types, charges taken while booking, Items
  Cashed Out, the cancellation notice. Tests that read the sheet on a stay's arrival day now
  read its check-out day; the gift certificate test sells on a daily sales account, as the
  lodge does.
- `business_logic_smoke.sql` gained sections for each change, on dates before any lodge or
  test data so the day's figures are its own.
