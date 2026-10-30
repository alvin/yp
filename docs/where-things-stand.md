# Where things stand

The one document to read. It sums up the work done from the lodge's feedback,
the decisions made along the way, and what is still open.
Everything below is live on the hosted system as of 30 October 2026.

---

## What the lodge asked for

**An admin area.** A separate part of the system, at /admin, for one login:
admin@yellowpointlodge.com. It does what until now needed Supabase itself, and
covers what Access's own admin menu did: the Room Form, the Inventory Form, the
Tax Rate Form, the lookup tables the rooms and items use, and Append Room Rates.
It has its own bar across the top (Sales Reports, Item Prices, Rooms & Rates,
Taxes and Year End Deposits) and a button back to the front desk. Signing in as
the admin login opens it, and that login also gets an **Admin** button on the
front desk.
Anyone else who opens /admin lands on the lookup screen, and the database
refuses their changes to taxes, prices and rooms. The login comes with the
system's setup files, so a fresh system has it too. Its password is the one you
gave; the setup files keep only a scrambled form of it, because the code is
public.

Every list in the admin area works the same way: click a line and it opens in
a panel that slides in from the right, with the same kind of fields, buttons
and messages as the front desk's own forms. Each page also has an info button
by its heading (at the top, on the two reports) that opens its help in the same
kind of panel: each task step by step, such as setting next season's prices for
a group of rooms, entering a tax holiday, undoing a rate entered by mistake, or
counting a kind of item but leaving some out. The help names each button and
field as the screen shows it, and the system's checks fail if a screen changes
and its help doesn't.

- **Sales Reports.** The Items Cashed Out report for any From and To dates,
  opening on this month so far. Each sale shows its date, with a subtotal for each item
  code and the totals. Two tabs at the top switch between **All items** and
  **Selected**. Selected adds two dropdowns, **Item types** and **Items**, where
  each entry has a tick box and the number sold. Tick Shirts and Clothing, then
  untick the caps, and the report lists every garment but the caps; the type's
  box shows as partly ticked and its button reads "Part of Shirts and Clothing".
  Each dropdown has **Select all** and **Clear**, and once something is typed
  into its search they work on the matches alone (**Select all results**, as in
  Excel's filter): type "hoodie", select all results, and every hoodie is in.
  **Clear** on the bar starts over. A sale counts on the day it was cashed out,
  the guest's check-out day, as on the daily Items Cashed Out. A report over a
  long stretch had been cut short at 1,000 lines; it now prints every line.
- **Item Prices**, in two tabs:
  - **Items**: everything the lodge charges for, in code order, with its type,
    unit price and taxes, and a search. A line opens the item to change its
    code, description, type, price, taxes and notes, or to disable it, sold or
    not. A disabled item leaves the front desk's list while its old charges
    still name it, and **Show disabled** brings it back into view to enable
    again. **Add item** enters a new one.
  - **Item types**: each type with the line of the Daily Cash report its
    items' sales go to, and **Add item type** for a new one.
- **Rooms & Rates**, in three tabs, as Access's Room Form and lookup tables
  kept them:
  - **Rooms**: every room in the lodge's sort order, with the Double, Single
    and Split rates it is charged today. A room opens with its details as on
    Access's form (room name, room #, room type, sort order, room code, room
    shorthand, room notes and its taxes), and below them its own rates, each
    with its code, price and dates. A rate opens in the same panel, with a way
    back to the room. **Add room** enters a new room, and the panel stays on it
    to give it its first rates. A room can be disabled; its stays keep it.
  - **Add rate** on the list puts one new rate on several rooms at once, as
    Access's Append Room Rates did: next season's Double rate for the twelve
    cottages is one entry. The rooms are ticked by name, and the panel lists
    them. Picking a rate code (R01, "Night for Two - Private Cottage") ticks
    the rooms charged at it now, which can then be changed. Each room's rate
    running when it starts ends the day before, and the panel says so.
  - **Rate codes**: each code and what it stands for, with how many rooms are
    at it; **Add rate code** for a new one, and a code's description can be
    changed.
  - **Room types**: **Add room type** for a new one.
- **Taxes.** Every rate of GST, PST, Liquor Tax, Room Tax and Destination
  Marketing Tax, with the dates it applies, newest first under each tax, as
  Access listed them. The rate in force is marked Current and one still to
  come Upcoming. A line opens the rate to change its rate, dates or notes. **Add
  rate** enters a new rate from any day, ahead of time included. When it
  starts while another rate is running, that rate ends the day before, and the
  panel says so before saving ("The 7% rate from 01-Jul-10 ends on
  31-Mar-27."). Two rates of one tax can never cover the same day: the system
  refuses and names the rate in the way. A charge is always taxed at the rate
  of its own date. A rate can be removed up to the day it starts, after
  confirming; the rate it ended picks up again, so a rate entered by mistake is
  simply undone.
- **Year End Deposits**, last on the bar: Next Year's Deposits, moved here from
  the Print Center, with From and To dates. It opens on January 1 to December
  31 of this year and prints exactly as it did; any other range prints its own
  dates.

**What the admin area doesn't change.** Everything on Access's Room, Inventory
and Tax Rate forms can be changed, except HST and Other (Hotel) Tax, which stay
as stored (see the decisions below); the notes on items and on tax rates were
the last to be added. Rooms and items are disabled, not deleted. Rate codes and
room types are added, and a code's description changed, but neither is renamed
or deleted. Of Access's other lookup tables, the front desk uses four, which the
admin area doesn't edit: salutations, phone types, payment types and payment
categories. The rest (cities, regions,
countries, diets, shuttle sites and the like) stay in the Access file, since
nothing in the new system reads them. The Exchange Rate Form and Archive weren't carried over.

**The daily reports in portrait.** Housekeeping, In House, the Kitchen/Meal
report and the 7-day kitchen report now print on an upright page, their lines a
size smaller again and set closer together. A room, a status or a date stays on
one line; only a guest's name and the notes wrap. The stay dates leave off the
year ("17-Jul"); the date at the top of each report keeps it ("for 17-Jul-26"),
and so does a housekeeping note's date, since notes are often from an earlier
year. Report by report:

- **Housekeeping** starts each line with the room, and the Res # column is gone.
  It ends on **Total Guests**, as Access's did: the guests arriving and staying
  on, not those leaving.
- **In House** has three sections: Arrive Today, In House and Depart Today. A
  party moving rooms is listed under In House, the room they leave directly
  above the room they move into, as Access's In House report did. Their dates
  show the move: the room left is "Out" that day, the new room "In" that day.
  The housekeeping report still marks the two rooms Move Out and Move In, as
  Access's did.
- **The Kitchen/Meal report** is titled **Daily Kitchen/Meal Report**, and the
  Res # column is gone.
- **The 7-day kitchen report** is titled **Weekly Kitchen Report**, and the
  Res # and Guest Diet columns are gone.

**The four reports checked against Access.** Each was compared with the Access
report itself and with the lodge's printed samples for 23 December 2025. The
lines on each report, and their order, match. Three things on the In House
report didn't, and now do:

- The figures at the top (Arrive Today, Depart Today, In House) are the number
  of **guests**, as Access printed them (19, 22 and 28 on the sample). Ours
  counted lines.
- **Total Guests** is the guests arriving plus those in house, not those
  leaving, as Access worked it out (47 on the sample). Ours also added the
  guests leaving that day, so it read 70.
- The **arrival time** prints only for a guest arriving that day, as in Access.

Where we still differ from Access, on purpose:

- A party **moving rooms is counted once**, in the room they move into. Access
  listed both rooms under In House and counted the party twice.
- The In House sections run Arrivals, In House, Departures, as the lodge asked
  on 17 September. Access printed Departures before In House.
- The **Kitchen/Meal report's Total Guests** is everyone at the lodge that day,
  including those leaving. Access's figure on that report came from a faulty
  formula: it multiplied one party's size by the number of bookings, and
  printed 88 on 23 December 2025, when about 70 guests were there.

**The Manual Sales List is a sheet to write on.** It's what the desk fills in
by hand at busy times, such as drinks before dinner, to enter later. Each line
now shows the room with its reservation number in small type underneath, then
the guest, then a wide, blank **Items** column with lines tall enough to write
in. The Room Order and separate Res # columns are gone. Rooms checking out that
day are left off, since they only mattered on the days before; Access's list
did the same. The text is a size smaller, like every report since the
Cancellation List changes. The line explaining the checkbox stays, as Access
printed it.

**No footers or page numbers on the reports.** The printed date and time at
the foot of each report, and the "Page 2 of 4" numbering, are gone. That also
stops the date printing over the last line of a long report.

**Requests are off the In House list, and room notes off the cancellation
notice.** The In House list's notes column printed the room's notes and the
guest's requests together; it now prints the room's notes alone, as Access's
In House report did. Requests have their own Requests report for the day, and
still print on the confirmation. The cancellation notice now prints no notes
at all; the room's notes are messages for a guest who is coming.

**The cancellation note goes back into the reservation notes.** Since 25
October, the note typed when cancelling had been added to the room's notes (the
occupancy notes). Those also print on the confirmation and the In House report,
and they stayed on the room after an un-cancel, so a reason for cancelling
could end up on the guest's next confirmation. It also never reached the
Cancellation List, which prints the reservation notes. The note is now added to
the office-only reservation notes again, as before 25 October. Access's desk
kept the reason there too ("12/23/25 res cxl'd as per Woodward…"). It now
prints on the Cancellation List. Access printed those notes on the
cancellation notice instead; it had no list that printed them. The
cancellation notice prints no notes at all, not even the room's notes, which
are messages for a guest who is coming. Un-cancelling leaves the note in place. The message
after un-cancelling has an **Edit notes** button that opens the reservation
notes, in case the desk wants to take it out. In the cancel dialog the note's
label now reads "Cancellation note (prints on the cancellation report)",
because it no longer prints on the notice.

**The Cancellation List covers a range of days.** It now has From and To dates,
like the 7-day kitchen report, and a column for the day each stay was
cancelled. It's no longer among the daily report tabs. From the Print Center it takes the report date and the
optional end date, or the week ending on the report date when there's no end
date.

**Smaller report text, dates on one line.** The reports print their lines a
size smaller, and a date like 27-Oct-26 no longer breaks across two lines. The
guest documents (confirmation, folios, bill, cancellation notice) keep their
sizes.

**A deposit refund, on any tender, from the cancel dialog.** The lodge found a
deposit refunded twice. Staff refunded it by hand from the Payment dialog, which
was the only way to refund on a different tender, and then cancelled with
"Refund the deposit". In every booking we checked, the system never wrote the
second refund: cancelling refunds only what is still held. The problem was the
screen. The Payment dialog refreshed the list of transactions but not the
deposit figure the Cancel dialog reads, so the dialog still showed "Deposit on
file $70" with "Refund the deposit", and the message after cancelling said
"Deposit (Refund)". Opening the reservation again loaded fresh figures, which is
why the refund wasn't offered on a later visit. Separately, nothing stopped a
refund entered by hand from being more than the deposit. One test booking had a
$70 refund against a $35 deposit. Three changes:

- The Cancel dialog, and Settle deposit, now ask for the **Tender type** when
  refunding, starting on the tender the deposit was taken on.
- Recording a charge or payment now refreshes the whole reservation, so every
  figure on the screen agrees.
- The system refuses a deposit refund larger than the deposit still held, from
  any screen. A deposit can no longer be refunded twice.

**Notes for reports, as on Richard's chart.** Kitchen and Housekeeping are as
they were. The other three:

- **Requests** now print on the confirmation, beside the diet and housekeeping
  notes. Two new reports list them. **Requests** in the Print Center's daily
  reports lists everyone at the lodge that day with a request (arriving, in
  house or leaving, the same people as the In House report). A **Requests**
  button beside **Guest notes**, on the reservation screen and the guest's
  page, lists that guest's requests stay by stay, oldest first. Cancelled stays
  are left out of both.
- **Occupancy** is a new tab. It edits the note each room of a stay carries,
  which Access called the occupancy notes and the In House report has always
  printed, though until now no screen could edit it. It prints on the In House
  report and, as Access did, under the room on the confirmation. (It also
  printed on the cancellation notice, as the chart asked, until 28 October,
  when the lodge asked for it off.) Those notes are the lodge's messages to the guest: "Please let
  us know who will be joining you", "ONE YEAR ONLY". The lodge's own sample
  confirmation prints one, and it now prints exactly as the sample does. (A note
  typed when cancelling joined them until 28 October; it now goes into the
  reservation notes, as described above.)
- **Reservation notes** are now office-only, like Guest notes: a button on the
  Reservation details card, marked "Office only — never printed." They used to
  print on the confirmation and the cancellation notice. That was a real leak:
  in Access these are the office's own record of a booking ("equal billing",
  "can no longer come due to medical reasons").

**Diets are just the notes.** The Diet pick list (Vegan, Vegetarian and so
on) is gone from the booking screen and from a reservation's Kitchen tab. A
diet is written in the Diet & allergy notes, as the lodge always has: in all
its history Access used the pick list once, for one guest out of 4,662 diets.
No data changes. A type already on file still prints ahead of the notes, and
the screens now show it in the notes box, where it can be read and corrected.

**No children or group when booking.** New Reservation, and with it Re-book,
asks for adults only; the Children and Group fields are gone. Access never
recorded a child, and its group names are the daily sales accounts and a few
stray keystrokes. The pen beside *Guests* asks for adults only too. An old
booking with a group name still shows it.

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
and confirm their requests again when they sign in. Guest notes and
reservation notes never print on anything a guest sees.

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

**Only what the system uses comes across from Access.** Of the Access file's
tables, only those the system uses are loaded, every row as before. The rest
stay in the Access file and are gone from the database: Access's own settings
and its list of staff, the lookups no screen offers (cities, countries, diets,
shuttle sites and so on), the lists and scratch tables its forms and reports
built, the tables from old price and rate loads, and the backup copies it kept
of the bookings, charges and payments, which are nearly all still in the live
tables. The setup file used to start a system without an Access file now holds
only the setup: rooms and their rates, the price list, tax and exchange rates,
and the pick lists the screens use. It never held guest data. It no longer
holds staff names or Access's own details either, though earlier copies remain
in the code's public history.

**A cleanup pass.** Unused code is gone, and code written several times over
is now written once. The reservation screen, about a quarter of the app's
screen code, is now a set of small parts, and the tests and the written
description of the system no longer repeat each other. Nothing the lodge sees
changed. The tools that load the data from Access produce exactly the same data
as before, and a rehearsal of go-live (an empty database, every change,
the full Access file, the smoke test) passes.

**A diet corrected straight after saving is filed once.** On a reservation's
Kitchen tab, saving a new diet and then correcting it filed a second copy, and
the kitchen report and guest documents printed both. A correction now replaces
the first. It hadn't happened on the hosted system.

**Room status is worked out, never guessed.** Rooms on the reservation screen
used to read "In house" whatever the date. They now read Future, Past, Arrive
today, Room move, Move out, In house or Depart today. On the Housekeeping
report, the room a party leaves on a move day reads **Move Out**, so
housekeeping knows it turns over. (The In House report listed moves under
their own headings until 29 October; it now lists both rooms under In House,
as described above.) Total Guests counts a moving party once, on
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

**Printed reports** carry no footer and no page numbers (the lodge, 28
October).

**Year-end deposits.** A **Next Year's Deposits** report (since 29 October,
the admin area's Year End Deposits) totals the deposits taken from January 1 to December 31 for stays after
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

- **The admin login is admin@yellowpointlodge.com,** on the same domain as the
  front desk login. Only that login opens the admin area, and only it can change
  the taxes and the price list, in the database as well as on screen.
- **Tax rates and room prices have dates, as in Access.** A change is a new
  rate from its day, so the lodge can enter it ahead of time; charges dated
  before it keep the old rate.
- **A new item type is given its Daily Cash line.** An item's type decides
  which line of the Daily Cash report its sales go to; a type without one would
  put them under Misc. The lodge's own types keep the lines they always had.
- **"The upcoming year" is the year now ending.** Year End Deposits opens on
  January 1 to December 31, 2026, the year whose deposits are being totalled.
  Opening on next year instead is a one-line change.
- **Year End Deposits is in the admin area only.** The Print Center's Year end
  card is gone.
- **The reports keep their names.** Sales Reports prints as Items Cashed Out,
  and Year End Deposits as Next Year's Deposits. The meal codes have no type in
  Access and come under "Other" in the Item types dropdown.
- **Taxes shows the five named.** HST and Hotel tax, both at 0%, stay in the
  system and off the screen. During the GST holiday, when GST was 0%, Access
  charged room nights HST at 3%; doing that again would need HST shown.
- **Rooms are kept one at a time, as in Access,** each with its own rates,
  with one entry for several rooms where Access used its Excel import. Since
  2016 the lodge has typed each year's price over the same rate (Eve's still
  reads "02-Jan-16 to 02-Jan-29" though its nights went from $276 in 2022 to
  $337 this year). A new price can now be entered for the day it starts, and
  the old one is kept.
- **Rate codes and room types are added, and a code's description changed,
  but neither is renamed or deleted:** the rates carry the code and the rooms
  carry the type, so a rename would leave them naming nothing. The lodge's own
  practice was to relabel a code ("R72, Not in use").
- **A room's taxes are the lodge's four** (GST, PST, Room Tax, DMT). Access's
  Room Form also showed HST and Other Tax, both at 0%; they stay as stored.
- **A rate put on several rooms is removed room by room,** since nothing marks
  that the rooms' rates were entered together.
- **Disabled items are hidden until asked for,** since most of the old list is
  disabled.
- **Access tables nothing reads stay in Access,** the backup copies of the
  bookings included: of their 15,057 bookings, all but six are still in the
  live tables. Bringing a table back means a line in the import's list and a
  table for it in the database.

- **The heading keeps the year** on the four daily reports; only the dates in
  the lines drop it. The heading is one line and says which day the sheet is
  for. Dates read "17-Jul", the lodge's usual style without the year.
- **A housekeeping note's date keeps its year,** though the lodge asked for
  dates without it. A note is often from an earlier year (the sample prints
  "23-Dec-23" on a 2025 stay), and without the year it would read as this
  week's. Every other date in the report lines drops the year.
- **"Smaller" is one step, as last time,** and only on the four reports named.
  The Manual Sales List, the Cancellation List, the Requests reports and the
  cash reports are unchanged. The Requests report is also landscape; it can go
  portrait the same way if the lodge wants.
- **"Daily" and "Weekly" are in the printed titles only.** The Print Center and
  the report tabs still call them "Kitchen / dietary" and "Kitchen — 7-day
  range", as the desk knows them. The In House report keeps its Res # column,
  since the request was for the other three.
- **Notes already added to rooms when cancelling stay there.** Nothing marks
  which lines came from cancelling, and on the test system they're all test
  bookings, which the go-live import replaces. One can be deleted from Notes
  for reports → Occupancy.
- **Reservation notes now print in one place,** the Cancellation List, an
  office report, so the notes dialogs now read "Office only." rather than
  "Office only — never printed."
- **The Cancellation List's date range uses From and To dates,** as the
  kitchen range report does, not a list of preset ranges.

- **Deposit (Refund) stays in the Payment dialog,** now capped at the deposit
  held, for the rare partial refund on a booking that isn't cancelled (a handful in
  all of Access's history). Cancelling is the usual way to refund. Removing it
  from the dialog is a one-line change.
- **A kept deposit stays on the tender it came in on,** since no money moves.
  The Tender type appears only for a refund.

- **Occupancy notes print on the confirmation too,** under the room, as Access
  printed them, though the chart listed only the cancellation notice and In
  House (you, 25 October). They came off the cancellation notice on 28
  October. The request reports leave out cancelled stays, and
  the day's report isn't added to the batch print run; either is a small change
  if the lodge wants it.
- **Diet types, child counts and group names stay in the database** for the
  old records that carry them; only the screens stop asking. Nothing in the
  data changes and everything prints as before. A diet type on file shows in
  the notes box and, once saved, is kept there as text.
- **The Number of guests pen dropped Children too,** so it asks what the
  booking screen asks.
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
1. **The admin password and the public code.** The code repository is public.
   The setup files hold only a scrambled form of the admin password, but it is a
   short phrase and could be worked out from that, and the hosted system holds
   guest data. Making the repository private, or giving the hosted admin login a
   different password, would close that.
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
