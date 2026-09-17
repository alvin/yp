# Changeset — front-desk output feedback (round 3)

**Date:** 2026-09-17
**Trigger:** twelve items of written feedback from the lodge, all under the heading "Items to do with *Output*".
**State:** 122 stories, 121 feature test files (one story still `@status:backlog`), 437 tests passing. `npm run check` clean, production build clean, `business_logic_smoke.sql` passing, local database verified byte-identical to the migration chain.

## What this document is for

The same shape as [round 1](2026-09-09-front-desk-input-feedback.md) and
[round 2](2026-09-10-rebook-is-next-years-reservation.md): what was asked, what
shipped, where it lives, the judgement calls, and how to back each one out. If a
revision lands badly, start from the relevant section and reverse only that one.
None of the twelve depend on each other except where a section says so.

---

## Delivery summary

| Area | Change |
|---|---|
| Database | one new migration, `supabase/migrations/0010_output_refinements.sql` |
| Spec | 8 new stories, 12 updated (114 → 122) |
| Tests | 8 new test files, 14 extended or rewritten (379 → 437 tests) |
| App | 2 new lib modules, 2 new shared components, 3 report bodies changed, 40 files touched |

New DB objects in `0010`:

```
ypl.digits_only(text)                   ypl.search_guests_by_name(text,int)  [replaced]
ypl.digits_pattern(text)                ypl.search_all_fields(text)          [replaced]
ypl.search_terms(text)                  ypl.search_by_date(date,text)        [replaced]
ypl.shared_room_occupancies(int)        ypl.report_check_in_folio(int)       [replaced]
ypl.report_stay_rooms(int)              ypl.report_checkout_bill_lines(int)  [replaced]
ypl.report_folio_receipts(int)          ypl.report_in_house(date)            [replaced]
                                        ypl.v_transaction_lines              [2 columns added]
```

**Deploy:** `0010` is applied locally only. Staging/production need it before the
app is deployed — the `run_remote_sql.py` command in `supabase/README.md`
already lists it.

---

## 1. Prepayments, gift certificates and diets on the check-in folio

> *"Can any prepayments, gift certificates and especially diets also show on the 'check in' folio in addition to the deposit? We like to confirm this stuff when people arrive."*

**Shipped.** The folio's single deposit line is now a list of every receipt held
against the stay — `Deposit (Received)`, `Prepayment (Received)` and
`Gift Certificate Received`, each with its tender and amount, oldest first. Below
it, the diet the kitchen holds for the party, in the same wording the kitchen
report prints.

**Where:**
- `0010` — `report_folio_receipts(p_reservationid)`; `report_check_in_folio` gains `diet_notes` and drops the `deposit_amount`/`deposit_type` columns the single line used
- `app/src/lib/components/reports/check-in-folio-body.svelte`, its route loader, and the batch loader
- Story `spec/features/show-receipts-and-diets-on-the-check-in-folio.feature`, test `.../show-receipts-and-diets-on-the-check-in-folio.test.ts`

**Judgement call — the deposit becomes one row in a list, not a row beside one.**
A stay with only a deposit prints exactly what it printed before: same label,
same tender underneath, same bold amount. Keeping a separate deposit block and
adding a second table for the rest would have put the deposit twice on any stay
carrying both.

**Judgement call — receipts only, not refunds.** `Deposit (Refund)` and
`Prepayment (Refund)` are not listed. The folio is what the desk confirms with an
arriving guest, and a refunded deposit belongs to a stay that is not arriving.
If the client wants the net position instead, the category list in
`report_folio_receipts` is one line to widen.

**To back out:** restore `report_check_in_folio` from `0006` and the folio body
from git history. `report_folio_receipts` can stay; nothing else calls it.

---

## 2. Room charges name their room on the check-out bill

> *"On the 'check out' folio, room charges are listed as 'Room'. Is it possible to add the text field that describes the room as well? Ie: 'Room – Lodge #6' or 'Room – Ruxton'"*

**Shipped.** A room-night charge reads `Room – Lodge #05`; a room known only by
name reads `Room – Ruxton`. A stay that moved gets one named line per room.

**Where:** `0010` — `v_transaction_lines` gained `roomname`/`roomnumber`
(appended, so nothing reading it by name is affected) and
`report_checkout_bill_lines` composes the description. Story
`name-the-room-on-check-out-bill-room-charges.feature` with its test.

**Judgement call — the stored room number, not the client's shorthand.** The
client wrote `#6`; the lodge's data stores `06`, and every other report in the
system prints it that way (`Lodge: 06` on the In House report, `Lodge 06` in the
room picker). The bill says `#05`. Consistency across the printed set matters
more than the shorthand of an email; one line in `0010` changes it if they
disagree.

**Judgement call — the room is appended to the description, not substituted for
it.** Where a clerk typed a note on a room-night line, that note is still the
description and the room follows it (`Deluxe upgrade – Lodge #05`). Substituting
`Room` for whatever was typed would have thrown the note away.

**To back out:** revert the `case` in `report_checkout_bill_lines` to plain
`t.description`. The two view columns are harmless left in place.

---

## 3. Room moves on the check-in folio and the confirmation

> *"On reservations where the guest will be moving between accommodations during their stay, the moves are shown on the look-up screen and the 'transaction' screen … Could the moves also be listed on the check-in and confirmation folios?"*

**Shipped.** Both documents list every room of the stay with its own in/out dates
and party size, in the order the stay occupies them. The existing Room / In / Out
/ # Guests table grew rows; the column labels stay on the first row.

**Where:** `0010` — `report_stay_rooms(p_reservationid)`;
`check-in-folio-body.svelte`, `confirmation-body.svelte`, their route loaders and
the batch loader. Story
`list-room-moves-on-the-check-in-folio-and-confirmation.feature`.

**Judgement call — no new copy at all.** A stay that never moves prints one row
under the same four labels, byte-identical to before. Nothing announces the
capability; a party that moves simply sees their moves.

**To back out:** stop passing `rooms` to the two bodies. They fall back to the
`room`/`in_date`/`out_date` columns the report RPCs still return, which is the
old behaviour exactly.

---

## 4. The batch print run goes to the right paper

> *"Can the individual items under the 'batch print reports' button … be sent to a particular printer according to the document? Ie: big reports go to printer #1 (8.5" x 11") and folios go to #2, (A5 'folio' paper), so the one button prints all the output on it's correct stock?"*

**Shipped, as far as a browser allows.** `/print/batch` now groups the run into
**Reports** (letter) and **Folios** (A5), each with its own page count and its own
print button. Each print action carries that stock's `@page size` and hides the
other group, so one action produces one stock and the operator sends it to the
tray holding that paper. Guest documents opened on their own print at A5 too, so
a single reprint matches what the batch produces.

**Where:**
- `app/src/lib/print-stock.ts` — the stock each output goes on
- `app/src/routes/print/batch/+page.svelte` — the two groups and the two print actions
- `app/src/lib/components/app/report-shell.svelte` — a `stock` prop; the four guest-document routes pass `a5`
- `app/src/lib/report.css` — the A5 fit (below)
- Story `print-each-batch-document-on-its-own-paper-stock.feature`; `use-established-paper-sizes.feature` and `batch-print-the-daily-print-run.feature` updated

**The honest limit — a web page cannot choose a printer.** There is no browser API
for it, and there will not be one: the print destination belongs to the OS dialog.
Two buttons instead of one is the closest thing to what was asked, and it is
better than it sounds in practice — Chrome remembers the destination and paper
size per site, so after the first run of each kind the operator is pressing
*Reports*, Enter, *Folios*, Enter. If the lodge wants literally one button, that
needs a helper installed on the front-desk machine, which is a different piece of
work and worth a conversation first.

**The documents had to be made to fit A5.** Declaring `@page size: A5` alone put
the folio on two sheets and the confirmation on three: they clone originals built
at letter proportions. Two things now happen for A5 and only for A5 —
`.report-page.a5 { zoom: 0.6 }` scales the whole sheet so every proportion of the
clone is preserved, and the documents' deliberate standoffs (the signature area,
the footer gap) scale by a further 0.45 through a `--gap` variable, so the type
stays readable rather than being shrunk to make room for whitespace. Measured:
folio, confirmation, check-out bill and cancellation each land on **one** A5
sheet. A stay occupying seven rooms takes two, which is simply more content than
one slip holds.

*Worth knowing:* the on-screen preview still shows the document at full size. It
is a preview; the printed output is the faithful scale-down.

**To back out:** remove `stock="a5"` from the four guest-document routes and the
`.report-page.a5` rules from `report.css` — everything returns to letter. The
batch grouping is independent: restoring the single Print button means reverting
`print/batch/+page.svelte` from git history. The `standoff` class and `--standoff`
values are a no-op at `--gap: 1`, so they can stay either way.

---

## 5. The In House report is separated into sections

> *"The 'In House' list report consolidates the 'arrivals', 'in-house' and 'departures' on one report and lists the status in the left column. Could you separate them more obviously? Ie; Header = 'Arrivals', show all arrivals, print line, print header = 'In House', print all in-house, etc."*

**Shipped.** Each section prints under its own heading with a rule above it, in
the order the day runs: **Arrive Today**, **Move In**, **In House**,
**Depart Today**. The Section column is gone — the heading a row sits under says
which it is. A section with nothing in it is not printed.

**Where:** `0010` — `report_in_house` reordered;
`app/src/lib/components/reports/in-house-body.svelte`. Story
`print-in-house-occupancy-report.feature` gained three ACs; its test gained four
cases.

**Judgement call — the report's own words, not the client's.** The client wrote
"Arrivals" and "In House". The report has always called them *Arrive Today* and
*Depart Today* in its counts line, which is existing copy and stays. The headings
use those same words, so one report does not name the same thing two ways.

**Judgement call — the Section column is removed, not kept alongside.** Keeping
both would repeat on every row what the heading already says, which is the
crowding the client is asking us to fix.

**Judgement call — this departs from `original_spec/reports/in_house_report.html`.**
The project rule is that printed reports clone the originals exactly. Here the
client has looked at the clone and asked for something different, which overrides
the clone. Everything else on the sheet — the black bar, the title, the counts
line, the columns, the footer — is untouched.

### The same treatment on the date search list

The lodge prints the day from two places: the **In House report** in the Print
Center, and the **In house** list on the date search screen, which has its own
*Print list* button. Both consolidate arrivals, in-house stays and departures
with the kind against each row, so both are sectioned the same way — **Arrivals**,
**In house**, **Departures**, each under its own heading, with the Match column
dropped. Section names are the ones the mode buttons on that screen already use.

**That list's print was also broken.** Every cell carried `whitespace-nowrap`
inside a card with `overflow-hidden`, and the route declared no page size: the
table was wider than a portrait sheet and the right-hand columns — Deposit, Match
— were simply cut off. It now prints landscape, un-clipped, with long guest names
and multi-room stays wrapping. A 72-row in-house day went from four truncated
sheets to three complete ones. Covered by a new story,
`print-the-date-search-list.feature`, because nothing covered that button before,
which is how it stayed broken.

**Where:** `app/src/routes/date/+page.svelte`. Stories
`show-date-match-type.feature` (three ACs) and `print-the-date-search-list.feature`.

**To back out:** restore `in-house-body.svelte` and `date/+page.svelte` from git
history. The SQL ordering change can stay; it is only an `order by`.

---

## 6. A red mark on a room two reservations hold at once

> *"The system allowed me to make reservations for two different guests in the same cabin on the same date … sometimes people share a room and we do it on purpose, so it's good. Would it be possible to have a little icon show on them when two reservations have the same dates and rooms? It would be nice if it was red and said 'shared'."*

**Shipped.** A red **Shared** badge on the date search results and on the
reservation screen's Rooms & moves card. On the reservation screen each mark is
followed by the other party — reservation number, name, and the nights the two
stays share — as a link to that booking. Nothing prevents the double booking; it
is reported.

**Where:**
- `0010` — `shared_room_occupancies(p_reservationid)`; `search_by_date` gained a `shared_room` flag
- `app/src/lib/components/app/shared-room-badge.svelte`, `routes/date/+page.svelte`, `routes/reservations/[resnumber]/+page.svelte` and its loader
- Story `flag-a-room-shared-by-two-reservations.feature`

**Judgement call — a turnover is not a share.** Two stays count as sharing only
when they hold the room for at least one night in common
(`a.in < b.out and a.out > b.in`). A party leaving on the day the next arrives
touches but does not overlap. Without this the lodge's ordinary daily turnover
would paint most of the board red and the mark would mean nothing. Cancelled
reservations are excluded for the same reason.

**Judgement call — the query reads the assignment tables, not
`v_occupancy_summary`.** The date search asks the question once per result row;
through the view a busy in-house day cost 573 ms, and against the base tables the
flag costs nothing measurable — the date search runs in the same 11 ms it did
before. The rule is written once, in one function, and the date search calls it.

**To back out:** drop the `shared_room` column from `search_by_date` (restore the
`0006` definition) and remove `<SharedRoomBadge>` from the two screens.
`shared_room_occupancies` can stay; it is a read helper with no side effects.

---

## 7. A phone number matches however it is punctuated

> *"Could the search phone number input have a mask so the number doesn't have to be input in the exact format? (ie: 2505926029 instead of (250) 592–6029)"*

**Shipped.** The all-fields search compares telephone numbers on their digits.
`2505926029`, `(250) 592-6029`, `250-592-6029` and `250.592.6029` all find the
same guest, whichever way the number is stored.

**Where:** `0010` — `digits_only`, `digits_pattern`, `search_terms`, and the phone
branches of `search_all_fields`. Story `match-a-phone-number-in-any-format.feature`.

**Two rules, because there are two ways to type a number.** An entry that is
*nothing but* a number satisfies the whole query at once, so the space in
`(250) 592-6029` is not read as a keyword the record must also carry. And any
single token carrying seven or more digits matches on digits, which covers
`Karen 2505926029`. Below seven digits a bare number is left alone: a six-digit
run is far more likely to be a street number or a reservation number, and
matching it against every phone in the lodge would bury the result.

### And the same on the way in

Matching was only half of it. Every telephone field now accepts the number typed
any way and writes it back in the format the lodge's records already use when the
clerk leaves the field: `2505926029`, `250.592.6029` and `250-592-6029` all become
`(250) 592-6029`; seven digits become `592-6029`; eleven starting with 1 become
`1 (250) 592-6029`.

**Nothing is forced.** A number the format does not cover is kept exactly as
typed — `+44 20 7946 0958`, `250 592 6029 ext 12`, anything carrying a word — and
**no number already on file is rewritten**. Records stay as the lodge entered
them, and search finds them either way, which is what the matching half is for.

**Where:** `app/src/lib/phone.ts` (`formatPhone`),
`app/src/lib/components/app/phone-input.svelte`, used by the phone field on the
new-reservation screen — the only telephone entry field in the app today, and the
component every later one should use. `0010` for the matching.

**To back out:** put a plain `<Input>` back on the new-reservation screen; the
matching half is independent. To remove the matching too, drop the two phone
branches from `guest_field_hits` in `search_all_fields`.

---

## 8. Bed choice reads Regular or Split

> *"On the 'new reservation' screen the option to choose 'double/twin' beds is universally available to all reservations, although all our rooms don't have that option. Please change the 'double' or 'twin' option to 'Regular' or 'split' thanks?"*

**Shipped.** The field is labelled **Beds** and offers **Regular** and **Split**,
on the new-reservation screen and on the reservation details card.

**Where:** `app/src/lib/data/reference.ts` (`BED_TYPES`, `bedTypeLabel`),
`app/src/lib/options.ts` (`bedTypeOptions`), the two screens. Story
`create-reservation.feature` gained an AC; its test gained two cases.

**Judgement call — the label changes, the stored value does not.**
`ypl.reservations.bedtype` still holds `Double` / `Twin`. That vocabulary is the
Access source's, it is in every imported row that carries a bed type (31,097
`Double`, 12 `Twin`, 11 blank), the column comment documents it, and the import
is verified lossless against it. Renaming the data would either break that
verification or be undone by the next import. The mapping is four lines in
`reference.ts` and the only place it exists.

*Residual risk:* someone reading `ypl.reservations` in Supabase sees `Double`
where the screen says `Regular`. The mapping is documented in `app/README.md` and
in a comment beside it.

**To back out:** change the two `label` values in `BED_TYPES` back to `Double`
and `Twin`, and the field label from `Beds` to `Bed type`.

---

## 9. Guest number in the all-fields search

> *"There appear to be both 'reservation' numbers and 'guest' numbers as we have now. Could 'guest number' be added to the 'all fields' search?"*

**Shipped.** Entering a guest number returns that guest, with `guest number` named
as the field that matched, beside any reservation whose number is the same digits.

**Where:** `0010` — the `guest number` field in `search_all_fields`. Story
`find-a-guest-by-guest-number.feature`.

**Judgement call — the guest number matches only when typed in full.** Every
other field matches on a fragment. A guest number is an identifier read off a
record, not a field to browse, and matching fragments would mean a search for a
phone area code also returned every guest whose id contains those digits. The
fragment `1234` does not return guest 12345; `12345` does.

**To back out:** remove the `guest number` row from the `guest_fields` values
list. The `exact` match mode becomes unused and can go with it.

---

## 10. An ivory page behind white controls

> *"Could you make the background a tiny shade or two more 'ivory' than the buttons and input areas, so there is a little more contrast and they're more obvious while keeping the clean and beautiful, Zen like simplicity?"*

**Shipped.** Three surfaces instead of two, evenly spaced and warming as they
recede:

| | | |
|---|---|---|
| `--background` | `oklch(0.971 0.016 95)` | the ivory page |
| `--card` | `oklch(0.987 0.007 95)` | the card or panel a group of fields sits in |
| `--field` | `oklch(1 0 0)` | what a clerk types into or clicks — white, so it lifts |

Each step is about the same size (0.016, then 0.013), which is what keeps it
quiet. Nothing else about the theme moved: the pine primary, the sage accent, the
type and the spacing are untouched.

**Where:** `app/src/app.css` — `--field` is new (registered as `bg-field` in the
Tailwind theme block), `--card` came down off pure white, `--secondary` and
`--muted` moved with it so chips and toggle tracks still read against a card that
is no longer white. Then every control moved onto `bg-field`: input, textarea,
the combobox trigger, outline buttons, the active tab, the native date inputs and
the inline toggles.

**Two passes, because the first one only did half.** Painting the page ivory and
leaving everything else white gave the *cards* contrast but not the *fields* —
card and input were the same pure white, so a form still read as one flat sheet.
The textarea and the combobox trigger were `bg-transparent`, which would have
made them worse still: they would have taken the card's colour while the inputs
beside them stayed white. Both are explicit surfaces now.

**To back out:** set `--card` back to `oklch(1 0 0)` and `--field` to the same.
Every `bg-field` becomes invisible against `bg-card` again, so the class swaps can
stay.

---

## 11. US currency is off the desk

> *"I think we can 'hide' any reference to U.S. currency. The fluctuating exchange rate makes estimation inaccurate, most people use credit cards and we are working fine without that feature being used at the moment anyway. This might be something we talk to about on 'Feedback 1.1' when we'll take a closer look at the 'DCAR' but we're good for now."*

**Shipped.** The Funds selector and the CDN-value estimate are gone from the
payment dialog and from the charges-and-deposit panel used while booking. The
tender list no longer offers `U.S. Cash`, `U.S. Cheque`, `U.S. Exchange` or
`U.S. Traveller's Cheque`. Receipts post in Canadian funds.

**Where:** `reservation-ledger.svelte`, `charge-basket.svelte`, `options.ts`
(`currencyOptions` deleted), `reference.ts` (`PAYMENT_CURRENCIES` and the
exchange-rate load deleted; US tender types filtered out), `charges.ts`
(`usdToCdn` deleted), `mutations.ts` (`recordPayment` no longer takes a
currency — the database defaults it), `pending-charges.ts`. Story
`convert-us-funds-to-canadian-automatically.feature` gained an AC; its test
gained three cases.

**Judgement call — the conversion stays in the database, untouched.** The
`payments` trigger still fills `paymentamountcdn` from the rate effective on the
payment date. Rows already on file keep their value, a row written directly in
Supabase still converts, and nothing about existing records changed. This is a
screen change only.

**Judgement call — the DCAR and its appendices are untouched.** The client's own
message defers the Daily Cash Activity Report to "Feedback 1.1", and the DCAR,
Deposits Received and Deposits Applied are exact clones of the lodge's originals
— the Funds column and the "All US amounts converted to Cdn" note are printed on
the papers they hand us. Changing them now would break the clone for a
conversation the client has asked to have later. **This is the open item for the
next round.**

**To back out:** restore `currencyOptions` and `PAYMENT_CURRENCIES`, drop the
`HIDDEN_TENDER_PREFIX` filter, and restore the two dialogs' Funds/CDN fields and
`recordPayment`'s currency argument from git history.

---

## 12. "Shared reservation" and the company field are gone

> *"Please delete the 'shared reservation' reference and the 'company' field."*

**Shipped, in two parts.**

**"Shared reservation."** Name search no longer classifies a match. Round 1
returned, alongside the people a search names, everybody who had ever shared a
stay with one of them, flagged `match_kind: 'shared reservation'`. That is gone:
a search returns the people it names. The other names a match's stays are booked
under still show beneath the name as "with …", which is the part of round 1 the
client asked for and kept. Guest history, which said "Shared with …" against a
multi-name booking, now says "with …" too.

**The company field.** Removed from the new-reservation screen, from the guest
profile line, from the fields the all-fields search reads, and from the fields
name search reads. The lookup screen's helper text no longer offers it.

**Where:** `0010` (`search_guests_by_name`, `search_all_fields`),
`types.ts`, `mutations.ts`, `routes/reservations/new/+page.svelte`,
`routes/guests/[guestId]/+page.svelte`, `routes/+page.svelte`,
`guest-search.svelte` unchanged. Stories
`include-second-reservation-name-in-guest-search.feature`,
`search-guests-by-partial-name.feature`, `run-all-fields-search.feature`,
`create-guest-profile.feature` and
`represent-multi-name-reservation-participation-within-history-co.feature`
updated, with their tests.

**Judgement call — "shared" is now reserved for a shared room.** Item 6 asks for
a red *Shared* mark meaning two reservations in one room. Item 12 asks to delete
the shared-reservation reference. Read together they say the word should mean one
thing, so guest history's "Shared with …" became "with …", matching the wording
already used beside a name search match. This is the one place in this round
where existing copy changed without being named directly; it is one word, and
leaving it would have put two meanings of "shared" on adjacent screens.

**Judgement call — `ypl.guests.guestcompany` is kept.** The column still exists,
the import still loads it, `create_guest`/`update_guest` still accept it, and
`guest_display_name` still falls back to it for the legacy rows that carry a
company and no name — without that fallback those rows would read
`[guest name missing]`. What is gone is the company as a field staff enter and
search. Dropping the column would break the lossless import, which is a
foundation of the project.

*Consequence worth knowing:* removing the co-guest expansion narrows name search.
Searching "Shillington" no longer also returns Gamble. Searching "Gamble" still
finds Gamble, and their stay still shows "with Shillington" beside it, so the
booking is still reachable from either name — through the person, not through a
list of other people.

**To back out:** restore `search_guests_by_name` and `search_all_fields` from
`0008` (which also restores `match_kind` and the company field), restore the
Company input on the new-reservation screen and the `· {guestcompany}` line on
the guest profile from git history, and put `match_kind` back on `GuestSearchRow`.

---

## Not asked for, but changed

- **A 30-second search was nearly shipped.** The first version of
  `search_all_fields` put the three match rules in one `case` expression in the
  join condition. Postgres cannot estimate a `case`, guessed the field/keyword
  pairs three orders of magnitude high, and chose a nested loop that took
  **33 seconds** on a one-letter search — against 456 ms for the version it was
  replacing. The fix is structural, not a tuning knob: one union branch per match
  rule so every predicate is a plain `column operator value`, and the
  every-keyword-present check done as a bitmask inside one aggregation chain
  rather than as a join between two aggregates whose row counts the planner has
  to guess. `search_terms` is plpgsql with an explicit `rows 3` for the same
  reason — an inlinable SQL function hands its body to the planner and the row
  estimate goes with it. All of this is commented where it lives, because it will
  look like needless complexity to the next person who reads it.
- **`supabase/tests/business_logic_smoke.sql`** gained a shared-room section
  (same-date share found from both sides, turnover not flagged, cancelled booking
  not flagged) and calls to the new report and search helpers. Its assertions are
  scoped to the run's own bookings: the database it runs against carries the
  lodge's real history, where rooms genuinely are shared.
- **The batch print date input** moved from `bg-background` to `bg-card` with the
  rest of item 10.
- **The date search results list** gained the section headings and the print fix
  described under item 5. Its *Print list* button had no story and no test; it has
  both now.
- **READMEs** updated: `supabase/README.md` (migration `0010` in the contents,
  order and deploy command, plus a section on the new read helpers and the
  planner note), `app/README.md` (print stock, the shared-room badge, the
  bed-layout mapping, Canadian-only funds), `README.md` (feature count 114 → 122).

---

## Verification

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0010_output_refinements.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/business_logic_smoke.sql
cd app && npm run check && npx vitest run && npm run build
```

At the time of writing: 437 tests across 121 feature files plus the coverage-map
meta-test, 0 type errors, build clean, smoke test passing. The working database
dumps identically to one built from `0001`–`0010` and `seed.sql`.

**Measured on the full dataset** (≈18.8k guests, ≈31.1k reservations, the local import plus this run's fixtures):

Timings are the warm steady state over repeated runs, measured in the same
session against the shipped `0008`/`0006` definitions so before and after are
comparable.

| Query | Before | After |
|---|---|---|
| `search_all_fields('smith')` — 555 results | 175 ms | 277–310 ms |
| `search_all_fields('a')` — 18,820 results | 275 ms | 299–307 ms |
| `search_all_fields('Karen Abbotsford')` | — | 300–309 ms |
| `search_all_fields('250-592-6029')` | **no match** | 305 ms, 1 result |
| `search_all_fields('2505926029')` | **no match** | 1 result |
| `search_by_date(today, 'in_house')` — 72 rows | 11 ms | 11 ms |
| `search_by_date(today, 'arrivals')` | 3.5 ms | 3.5 ms |

The all-fields search costs about 100 ms more on a plain keyword: it now reads
two more comparisons per phone field, and every guest carries two. It runs once
per Enter, not per keystroke. The shared-room flag costs the date search nothing
measurable — which is the whole point of reading the assignment tables rather
than the occupancy view.

**Printed output, rendered to PDF at the declared page size:** check-in folio,
confirmation, check-out bill and cancellation each one A5 sheet; a stay occupying
seven rooms takes two. The In House report is unchanged at letter landscape. The
date search list, 72 in-house rows: four truncated sheets before, three complete
ones after.
