# Where things stand

The one document to read. It sums up the work done from the lodge's feedback,
the decisions made along the way, and what is still open.
Everything below is live on the hosted system as of 9 October 2026.

---

## What the lodge asked for

**A print run for each kind of folio.** The folio paper is printed on the back
differently for each document (the waiver behind the check-in folio, arrival
instructions behind the confirmation), so they can't go through the printer
together. After *Review & print*, the batch now has a button each for
Confirmations, Check-in folios, Check-out bills and Cancellations, beside
Reports, and each prints only its own documents. Cancellation notices weren't
in the batch before; they are now.

**Ruled, shaded report lines.** The daily reports (Housekeeping, In House,
Kitchen, the 7-day kitchen report, Manual Sales, Cancellations) rule off each
room or guest and shade every other line. Browsers normally leave shading off a
printout unless a box in the print dialog is ticked; these reports ask for it,
so it prints either way. The cash reports are unchanged.

**Items Cashed Out without the rooms.** The appendix lists the liquor, sundries
and the rest, and no room nights, as the Access report did. Its "Agrees with
Daily Cash" check now ties it to the cash sheet's sales lines other than Room;
across 2024 to March 2026 they agree on every day.

**The extra guest is gone.** The reservation screen no longer adds a second
name, shows a "% of bill", or asks who a charge or payment belongs to; the card
reads *Guest*. A shared room is two reservations with the red Shared mark, as
the lodge described. Access never had a second name on a booking either:
partners are one guest record ("WILKINSON, DON & GLENNIS"), and name search
still finds either half of a double surname. The system now refuses a second
name on a booking, so it can't creep back in.

**The number of guests can be changed.** A pen beside *Guests* in Reservation
details changes the adults and children. The reports count guests room by room,
so the change goes to the room the party is in — that's what puts it on the
kitchen and housekeeping reports and the folio. Where a party is spread across
rooms held side by side (a family in two rooms, a group), the screen also asks
how many are in each room.

**Double, Single and Split.** The room-night Rate choice reads Double, Single,
Split, as Richard listed them; it used to read Regular, Special, Split, the
names on Access's pick list. Access's own rate codes describe the three the
lodge's way — "Night for Two", "Night for One", "Split Rate" — so the new words
mean exactly what Access meant. Which rate is charged, and its price, are
unchanged.

**The cash sheet applies the deposit, and balances.** Richard found a $1,000
deposit received on the sheet with no "deposit applied". The cause was bigger:
the sheet counted each charge on the day it was posted and never applied a
deposit, so its two halves only met when a stay was booked, charged and paid on
one day — across 2025 it balanced on 10 days of 365. Access counted a stay's
charges on the day the guest checks out (when they pay) and took the deposit off
that day as "Deposit (Applied)". The sheet now does the same, with no step at the
desk: whatever deposit or prepayment a stay still holds is applied on its
check-out day. Gift certificates and bills sent to accounts are taken off the
same way, and none of these count as card or cash receipts. Run against 2025,
216 days balance to the cent, 88 are out by cents of tax rounding, and 56 by
exactly what departing guests still owed that day. 15 Dec 2025 — the sheet the
lodge gave us — now reproduces its room, tax, refund and deposit-applied lines.

**A kept deposit comes to $0.00.** It showed −$70 on a cancelled $35 booking. A
kept deposit now counts like a charge, so the stay nets to zero. On the cash sheet
it is that day's revenue on a "Cancellation" line, and comes off as Deposit
(Kept) because the money came in earlier as a deposit; no card or cash line
moves. (Before, the $35 was also added to the Visa line, which only looked
balanced.)

**Un-cancel.** A cancelled reservation has an Un-cancel button where Cancel was.
The booking stands again — same number, dates, rooms and deposit — as Access
staff did by clearing the Cancelled box. Re-book is unchanged.

**A deposit to decide later.** Cancelling a booking with a deposit now offers
"Decide later" beside refund and keep. The deposit stays on the cancelled stay
and nothing reaches the cash sheet; "Settle deposit" on that reservation refunds
or keeps it when they know, dated that day.

**The cancellation slip** is offered, and prints, only for a cancelled booking.

**The pen.** Each charge line has a pen beside its garbage can to change its
quantity — eight beers on one line. The line keeps its price per unit and its
taxes follow; on a room line the nights change. Because charges now reach the
cash sheet at check-out, tidying a tab before then changes no sheet already
printed.

**Diet and housekeeping notes on the confirmation and check-in folio.**
Both documents now print the guest's diet (with its notes) and the
housekeeping note, so guests can catch mistakes when the confirmation arrives
and confirm their requests again when they sign in. Internal notes (guest
notes, request notes, room notes) never print on anything a guest sees.

**The room charge showed $0.00 before posting.** The charge dialog now shows
the room's rate before the charge is posted, and staff can still type over it.
Checking this against the old Access system turned up a real pricing bug: every
room has a Regular, Special and Split rate, and Access asked the clerk which to
use. Our system ignored the choice and usually charged the Split rate — half the
Regular rate for most rooms. The dialog now has a **Rate** choice, starting on
Regular, and posts that rate (since 9 October the choices read Double, Single
and Split).

**Back out to the guest's list of stays.** Opening a reservation from a guest's
history, a date search or an all-fields search, the button at the top left now
reads **Back** and returns to that list. Opened by reservation number, it still
goes to the lookup screen.

**Undo a room move.** A room move now has the same small garbage can as a
charge. Undoing it keeps the party in the room they were leaving for the whole
stay. If two rooms moved on the same day, the screen asks which one the stay
goes back to.

**Moving on the check-out date.** The move date now runs to the guest's
check-out date, for a guest who stays on if another room is free. Choosing that
date asks for the new departure (one more night to start), and the stay runs on
in the new room. Any other room the party holds still ends on the original
date.

**"ICS Crossover" is gone** from the payment-type list and the Daily Cash
report. The one payment that used it (a $35 deposit refund on #100084,
September 2024) keeps it, and that day's report still shows it.

---

## What else changed along the way

**Room status is worked out, never guessed.** Rooms on the reservation screen
used to read "In house" whatever the date. They now read Future, Past, Arrive
today, Room move, Move out, In house or Depart today. On the Housekeeping and In
House reports, the room a party leaves on a move day reads **Move Out**, so
housekeeping knows it turns over. Total Guests counts a moving party once, on
the In House and Kitchen reports alike.

**Recording a move.** The move date offers only the nights a move can actually
happen on. It used to start on today's date, which was always refused for a stay
that hadn't begun.

**Every room holds at least one night.** Five rooms had crept onto two
reservations (#113181 and #114203) that opened and closed on the same day, so
the reports showed them arriving and leaving that day. They came from adding a
room with the same in and out date, and from shortening a stay that moved rooms
on its last morning. They've been taken off, neither can happen again, and
shortening a stay now takes off any room it leaves with no nights.

**Changing a stay's room.** A pencil beside each room changes it outright, as
staff did in Access. Unlike Access, it won't change the room while a room
charge for the old room is posted — Access left 387 charges billing a room the
guest wasn't in.

**Correcting a guest's details.** The guest's page has **Edit details** for
every field the desk keeps. Attaching an existing guest while booking used to
throw away any corrections typed in; they are now saved.

**Room availability while booking.** Once the dates are in, rooms another stay
already holds for those nights are marked **Booked**. They can still be chosen,
since the lodge shares rooms on purpose.

**Notes save the way they read.** Every note on a stay now works the same way:
what's in the box is what prints, and an empty box means none. The housekeeping
note couldn't be cleared before, and a diet could only be set while booking;
both can now be changed or cleared from the reservation. The notes tabs also
used to copy every guest's notes onto the primary guest when saved; they now
edit only that guest's own note.

**Money figures.** The date search and the cancel dialog show the deposit
actually still held — after anything refunded, applied to the bill or kept.
The Daily Cash report gives every payment type and charge category its own
line, so the lines always add up to the total (one day in 2024 was $1,066.78
short).

**Printed reports** number their pages ("Page 2 of 4") as the originals did.

**Year-end deposits.** A **Next Year's Deposits** report (Print Center → Year
end) totals the deposits taken from January 1 to December 31 for stays after
that year, month by month, with what was refunded or kept and what is still
held at December 31. The $0.00 deposit lines Access added to new bookings
aren't counted.

**Charge lines carry no notes.** The Add charge dialog had a Notes box only
because the Access charges table had a notes column. Nobody asked for it,
Access never printed it, and staff used it once in 55,760 charges — yet here it
printed on the bill for room charges. It's gone: a charge line shows its item,
or "Room" and the room's name.

**Screen wording** that explained or narrated things was cut back to the fact.
The app footer reads "Copyright © 2026 Yellow Point Lodge".

**Under the hood.** Rules that were written several times over — which rooms
are in use on a day, how many guests are in house, how much deposit is held —
are now each written once, so reports can't disagree. Unused code, duplicated
code and duplicate stories were removed, and every story now matches what the
app does.

---

## Decisions made

- **Regular reads Double as well as Special reading Single,** to give the
  lodge's "double, single and split". Access's rate codes call them "Night for
  Two" and "Night for One", so nothing about the rates changes.
- **Only the daily reports are ruled and shaded,** not the cash reports or
  the guest documents. Any other report is a one-word change.
- **One guest per booking is a rule the system enforces,** not just a missing
  button, so the screens, reports and documents never have to account for a
  second name.
- **A changed number of guests goes to every room the whole party is in;
  rooms held side by side keep their own numbers,** which the desk sets in the
  same dialog. Access kept the booking's number and the room's apart, and about
  one single-room stay in eleven disagrees; setting the number brings them
  into line.
- **A kept deposit is revenue on its own "Cancellation" line** of the cash sheet,
  and the new screen words are Un-cancel, Decide later, Settle deposit and Change
  quantity (you, 5 October).
- **Deposits are applied by the system on the check-out day,** never by a clerk,
  so "Deposit (Applied)" is no longer on the payment list. Access's clerk step
  also reset each deposit line to $0.00; ours keeps it.
- **Deductions on the cash sheet print with a minus sign** (Deposit (Applied)
  −$70.00), as refunds always did, so the column adds up. The old Access sheet
  printed them unsigned; the sign is one line to change if the lodge's bookkeeper
  prefers it.
- **A charge posted after its stay's check-out counts on the day it is posted.**
  That covers walk-in sales on the daily sales accounts, which Access re-dated
  every night.
- **Reservation notes stay on the confirmation.** The old Access confirmation
  printed them, and the lodge uses them for messages to the guest. What was
  internal was the "Re-booked from #…" reference the app added; it no longer
  does.
- **Undoing a move made on the check-out date keeps the longer stay,** in the
  room the guest was leaving. That suits the lodge's reason for undo — a room
  frees up and the guest needn't move. If the guest isn't staying on after all,
  *Change dates* shortens the stay.
- **Room rates follow Access:** one rate for the whole stay, read on the date
  the charge is posted, of the type the clerk chooses.
- **US funds stay off the screens.** The Daily Cash report keeps its US lines
  until the lodge revisits that report, as they asked.
- **No tax rate on file for a date means no tax.** That's correct; the only risk
  is forgetting to enter next year's rates.
- **The `features/` folder** (the lodge's original feature pack) was removed; the
  living spec in `spec/features/` replaces it.

---

## Open items

**For you to decide**
1. **Weak tests** — see `docs/test-review-2026-09-29.md`, sorted into obvious
   fixes, obvious removals and questions.
2. **Date-range search** sorts by arrival rather than name, and never shows the
   Cancelled or Shared badges.
3. **Gift certificates.** The system can record a sale, but there's no button
   for it. You want to understand this before it goes to the lodge. A sale rung
   up on a daily sales account counts on the cash sheet the day it is sold; one
   added to a guest's stay waits for their check-out, like any charge.

**For the lodge**
4. **Testing the cash sheet before switchover.** The system's bookings are the
   Access copy from 28 March 2026. Stays that have checked out since were settled
   in Access, so their deposits (2,852 stays, $164,325) show as applied on their
   check-out days with nothing to match. A fresh Access import at switchover
   clears this.
5. **Room charges posted at the Split rate.** Before the rate fix, 9 of the 12
   room charges entered through the new system went in at the Split rate:
   reservations 113102 (three charges), 113111, 113141, 113220, 113937, 115143
   and 107033. Worth checking any that were real rather than testing.
6. **A record of changes to a reservation.** The system keeps when a booking
   was made, confirmed and cancelled, but not when its details were later
   changed. Offered to Richard as a "last changed" date or a full history.
7. **The Daily Cash report's US lines** — whenever they're ready to revisit it.
8. **Older charges.** 387 room charges from the Access years bill a room the guest
   wasn't in (rooms were changed after charging). Worth knowing if old bills
   come up.
9. **Questions still open from their original feature pack:** the weekly
   spreadsheet handoff; storing daily cash adjustments and staff-tip codes;
   printing or reprinting a single document; how exact the printed layouts need
   to be; moving a deposit when a stay is cancelled or re-booked.

**Known gaps nobody has asked for**
10. A room's own dates can't be edited separately, as they could in Access;
   stay dates change through *Change dates*. A room's own guest count can be set
   only where the stay holds rooms side by side; otherwise the room follows the
   booking's number.
11. All-fields search takes a few hundred milliseconds whatever is typed.

---

*Engineering detail — how each change was built and how to reverse it — is in
`docs/changesets/`.*
