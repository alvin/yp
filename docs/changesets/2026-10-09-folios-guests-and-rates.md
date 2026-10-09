# Changeset — a print run per folio, ruled reports, one guest per stay, the party size (round 13)

**Date:** 2026-10-09
**Trigger:** the lodge's latest round of feedback: separate print runs for each kind of
folio, ruled and shaded report lines, rooms off Items Cashed Out, the extra-guest function
removed, the number of guests changeable, and the Special rate renamed.
**State:** `npm run check` clean, every feature test and `business_logic_smoke.sql`
passing. `0023`–`0025` applied to the local stack and, on 2026-10-09, to the hosted project
(in one `begin … commit`, before the app was pushed). Go-live rehearsed: an empty
PostgreSQL 17 database, every migration, then the full import generated from the `.accdb`
by `export_access_data.py` — it loads, and the smoke test passes on it.

---

## 1. A print run for each kind of folio

> *"The smaller folios have different printing on the back depending on their functions.
> The 'check in' has the waiver, the confirmation has arrival instructions, 'check out's are
> blank, etc. So, in 'print centre' after the 'review and print' button, could we have
> separate ones for 'confirmations', 'check-in', 'check-out' and 'cancellation' folios?"*

**Shipped.** The batch page (Print Center → Review & print) prints the daily reports as one
group on letter, and each kind of guest document as a group of its own on A5:
**Confirmations**, **Check-in folios**, **Check-out bills**, **Cancellations**, one print
button each. A print hides every other group, so only that paper's documents go to the
printer. The batch didn't carry cancellation notices at all before; it now does, and the
Print Center's summary counts them. The notice's markup moved unchanged into
`cancellation-notice-body.svelte`, as the other three documents' already had, so the batch
and the single notice print the same thing.

**Judgement call — the buttons sit in the batch page's toolbar,** where Reports and Folios
were, in the vocabulary the Print Center's tabs already use (plural). A group with nothing
that day keeps its button, disabled, so the five are always in the same place.

**Not changed:** the four daily reports still print together; a document opened on its own
still prints on its own paper.

**To back out:** restore the batch page and `print-stock.ts` (its `STOCK_LABEL`) from git,
drop `loadCancellations`, and the cancellation term from the Print Center summary.

---

## 2. Ruled, shaded lines on the daily reports

> *"If there could be lines between each room/guest entry that would be great and if you
> could 'alternate line' shade tone them so the lines are very distinct, that would be great."*

**Shipped.** `table.ruled` in `report.css`: a rule under every line and every other line
shaded `#e4e4e4`, on Housekeeping, In House, Kitchen/Meal, Kitchen (7-day), Manual Sales
and the Cancellation report — the reports that list a room or a guest a line.

**Footgun avoided — browsers don't print shading.** Chrome, Safari and Firefox leave
background colour off a printout unless the print dialog's "Background graphics" box is
ticked, and it starts unticked. The ruled tables set `print-color-adjust: exact`, which
prints them regardless. Verified by printing a 134-line housekeeping report to PDF with
backgrounds off: the grey fill is on every page with the rule, and gone without it.

**Judgement call — the daily reports only.** Not the cash reports (the Daily Cash Activity
Report and its appendices), whose lines are amounts by category rather than rooms or
guests, and not the guest documents. Adding the class to another table is one word.

**A departure from the originals,** which ran their lines together; `CLAUDE.md` says the
printed reports clone them exactly, and this is the lodge's own exception, recorded in the
operations-reports story and `app/README.md`.

**To back out:** remove the `table.ruled` rules from `report.css` (the class can stay).

---

## 3. Items Cashed Out lists the items, not the rooms

> *"On the 'Items Cashed Out' report, in addition to the liquor and sundries, etc. the rooms
> also appear. They don't need to so if those entries could be deleted, that would be great."*

**Shipped** (`0023_items_cashed_out_without_rooms.sql`). The appendix leaves out lines in
the Room category. That restores Access: `qryReportItemCashedOut` selects
`tblTransaction.RoomID Is Null`. Room lines were nearly half the appendix — 16,747 of
33,969 lines from 2024 to March 2026.

**Judgement call — by category, not by room.** The cash sheet totals its Room line by
category, so leaving out the Room category keeps the appendix equal to the sheet's other
sales lines. Access's room test differs on three lines in all its history (two typed Room
with no room, one liquor line carrying a room).

**The balance check follows.** "Agrees with Daily Cash" compared the appendix's sales and
taxes with the sheet's sales and taxes. The sheet's tax lines carry room and item taxes
together, so the check now ties the appendix's Total column to the sheet's sales lines other
than Room and Cancellation. Verified: on all 821 days from 2024 to March 2026 the two agree
to the cent.

**To back out:** restore `report_items_cashed_out` from `0021` and the appendix loader's
`dcar_sales_and_taxes`.

---

## 4. One guest per stay: the extra-guest function is gone

> *"We don't actually need the 'extra guest' (with the '% payment') function on the
> reservation screens. In a case where a room is shared, the staff just make an extra
> reservation to keep all the charges and payments separate and your little red 'shared'
> room alert button is all we need for this."*

The owner asked for every trace to go from the screens, the stories and the tests.

**Legacy evidence.** Access never used it: all 30,296 of its reservation-guest rows are the
only name on their stay, primary, at 100% of the bill. Partners are one guest record
("WILKINSON, DON & GLENNIS"), which is how the name search finds "the second last name"
the lodge asked for in round 1.

**Shipped.**
- *Screens:* the reservation's Guests card is a **Guest** card showing the guest (and
  vehicle); the Add guest button and dialog, the Primary badge, "% of bill" and the
  per-guest balance are gone. The charge and payment dialogs lose Charge to / Received
  from. Name search and a guest's history lose the "with …" line.
- *Database* (`0024_one_guest_per_stay.sql`): a unique index holds a reservation to one live
  guest, so a second is refused however it is written. `add_reservation_guest` is dropped,
  and with it the extra-name fields: `other_names` (search) and `guest_co_names`,
  `party_size`/`co_guests` (history), `guest_names` (confirmation, folio, bill) and
  `reservation_guest_names`, the view's percent and per-guest balance, and
  `update_reservation_guest`'s percent parameter. A guest written straight to the table now
  defaults to primary at 100%, as `create_reservation` writes it.
- *Spec:* four stories and their tests deleted — record multiple guest names, assign ledger
  responsibility, represent multi-name participation in history, include the second
  reservation name in search. The double-surname criterion from the last moved into
  *search guests by partial name*, with its test. *Keep one primary guest per reservation*
  became *keep one guest per reservation*. The transaction-screen wireframe's
  "Shared occupancy — 50% / 50% of bill" is gone, and two wireframe lines naming several
  guests on a stay now name the party.

**Verified:** every printed name is unchanged. The confirmation, folio and bill, run for all
30,970 reservations before and after `0024`, return identical rows apart from the dropped
column. (673 Access bookings have no guest at all; they printed `guest`'s placeholder
before and still do.)

**The go-live import.** Access has never had a second name on a booking, so the rehearsed
import loads under the new index. If the lodge's go-live file ever did, the import would stop
on the index rather than load it. The hosted project's test data, where the lodge tried Add
guest, has extra names that block the index there; they are deleted directly on the hosted
project before `0024` is applied, as test leftovers always are, and nothing in the repo
changes data.

**Not changed:** the Shared mark; `reservation_guests` and its Access columns
(`percentageofbill` keeps its imported value); the names `primary_guestid` /
`primary_reservationguestid` in the views, which now simply mean the stay's guest.

**To back out:** drop the index, restore the dropped functions and columns from `0005`,
`0006`, `0008`, `0010`, `0011` and `0014`, and the column defaults from `0005`; revert the
app from git and restore the stories and tests from git.

---

## 5. The number of guests can be changed

> *"If there was a way to manually override the 'number of guests' under 'reservation
> details' once a reservation is made, that would be another bonus."*

**Shipped.** A pen beside **Guests** in Reservation details (hidden on a cancelled booking,
like Change dates) opens **Number of guests on #…**: Adults and Children, as the booking
screen asks. It saves through the existing `update_reservation`.

**The footgun — the reports count rooms, not reservations.** Housekeeping and In House print
each room's count, Total Guests adds the rooms up, and the guest documents print the first
room's. Changing only the reservation's number would change nothing the kitchen or
housekeeping read. So (`0025_party_size.sql`) when the number changes, every room the whole
party is in takes it: a room no other room of the stay shares a night with, which includes
each room of a move. Done as a trigger, like the stay dates, so a direct database edit
follows too.

**Judgement call — rooms held side by side keep their own counts.** A family across two
rooms, or a group across twenty, splits the party in proportions the reservation doesn't
record (one group in the data has 30 adults and a count of one in each of its 20 room
lines). For those stays the dialog also
lists the side-by-side rooms, each with its own number (`update_room_assignment`). That is
a partial answer to the open item about editing a room's own guest count.

**Access drift.** Access kept the two numbers apart, and about one single-room stay in
eleven disagrees (1,040 say 1 adult on the reservation and 2 in the room). Setting the
number brings the room into line. 4,192 Access rooms have no count, which prints blank and
counts as nothing in Total Guests; setting the number fills those rooms in too.

**Rules:** a reservation holds at least one guest and a room at least one; both are checked
only when a number is written, so Access's zeros and blanks load as they are.

**Also:** "2 child" now reads "2 children".

**To back out:** drop the `reservations_sync_room_guests` and `room_assignments_guest_count`
triggers and functions; remove the pen and dialog.

---

## 6. Double, Single and Split

> *"When posting room charges, at 'Add Charge', 'room night', 'rate', please change the text
> from 'special' to 'single', so we have 'double', 'single' and 'split'."*

**Shipped.** The Rate choice reads **Double**, **Single**, **Split**, starting on Double.

**Regular reads Double too.** The request names Special → Single and gives the result as
"double, single and split"; the first option read Regular. Access's pick list said Regular,
Special and Split (`tblLookupRoomRateType`), but its own rate codes describe them as the
lodge does: every Regular rate is coded "Night for Two", every Special rate "Night for One",
every Split rate "Split Rate". So the screen now uses the meaning Access recorded, in the
lodge's words. Which rate is charged, and its price, are unchanged; the rate table keeps
Access's names, as the bed choice keeps Double/Twin under Regular/Split.

**To back out:** the three labels in `reservation-ledger.svelte`.

---

## Not asked for, but changed

- **The letterhead takes one name.** It split a list of names onto lines; it now prints the
  guest's name, the same output.
- **The batch headings read "1 page"** rather than "1 pages".
- **Stories brought into step:** the batch print run, daily operations reports, Items
  Cashed Out, post room-night charges and pricing (the rate names), partial-name search.
  The balance-check test now runs Items Cashed Out on a day with a room and an item.
- `business_logic_smoke.sql` gained sections for one guest per stay, the party size and
  Items Cashed Out, and lost the primary-guest swap.
