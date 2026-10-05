# Where things stand

The one document to read. It sums up the work done from the lodge's feedback,
the decisions made along the way, and what is still open.
Everything below is live on the hosted system as of 5 October 2026.

---

## What the lodge asked for

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
Regular, and posts that rate.

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
   for it. You want to understand this before it goes to the lodge.
4. **Split bills.** How a bill is split between guests beyond percent-of-bill —
   likewise yours to understand first.

**For the lodge**
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
   spreadsheet handoff; storing daily cash adjustments and staff-tip codes; how
   a stay with several named guests should show; printing or reprinting a
   single document; how exact the printed layouts need to be; moving a deposit
   when a stay is cancelled or re-booked.

**Known gaps nobody has asked for**
10. A room's own dates and guest count can't be edited separately, as they
   could in Access; stay dates change through *Change dates*.
11. On a stay with several guest names, the notes tabs edit the primary guest's
   notes only.
12. All-fields search takes a few hundred milliseconds whatever is typed.

---

*Engineering detail — how each change was built and how to reverse it — is in
`docs/changesets/`.*
