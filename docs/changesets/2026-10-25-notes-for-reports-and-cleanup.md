# Changeset — notes for reports, requests reports, and a cleanup pass (round 15)

**Date:** 2026-10-25
**Trigger:** the lodge's chart "Requested Updates on 'Notes for Reports'": Kitchen and
Housekeeping good as is; Requests on the confirmation too, with two requests reports; a new
Occupancy button printing on the cancellation notice and the In House report; the
Reservation note a copy of Guest Notes that prints on nothing. Alongside it, a full audit
for dead code, duplication and duplicated tests, with no change to any feature.
**State:** `npm run check` and `npm run build` clean, every feature test and
`business_logic_smoke.sql` passing. `0026` applied to the local stack and, on 2026-10-25, to
the hosted project in one `begin … commit` (its functions checked against the local
stack's), just after the app's push to `main` deployed. Go-live rehearsed: an empty PostgreSQL 17 database, every migration,
then the full import from the `.accdb`. It loads, the smoke test passes on it, and #115732's
confirmation carries its Access message.

---

## 1. Kitchen and Housekeeping

> *"Good as is."*

Unchanged.

## 2. Requests: on the confirmation, and two reports

> *"The office would like this to print on the confirmation slip as well. Could we also
> generate two reports with 'request' text? One would show all requests on any given day,
> The other would show all requests for any given guest selected, sorted by date … ideally
> located by the existing 'guest notes' call button at the 'guest info' box."*

**Shipped.**
- The confirmation prints a **Requests:** line beside Diet and Housekeeping
  (`report_reservation_confirmation.request_notes`, from `stay_request_notes`).
- **Requests** report for a day: Print Center → Daily reports, and a tab among the daily
  reports (`/reports/requests`, `report_requests`). It lists every stay at the lodge that day
  with a request, as the In House report counts them (`rooms_held`), by guest name, with
  rooms and dates.
- A guest's requests: a **Requests** button beside **Guest notes**, on the reservation
  screen's Guest card and on the guest's page (`/reports/guest-requests/[guestId]`,
  `report_guest_requests`). Each stay with a request, oldest first. Opened from a
  reservation, Back returns to it.

**Judgement calls.**
- "Any given day" is the In House set: arriving, in house or departing (Alvin, 25 Oct).
- Cancelled stays are left out of both reports; their requests never happened.
- The day report is not added to the batch print run, which wasn't asked for. It is one
  line in `print/batch/+page.ts` if the lodge wants it there.
- "Sorted by date" is oldest first, by arrival.
- The Requests tab's placeholder read "Occupancy & in-house requests", which named the new
  Occupancy tab; it now reads "In-house requests". Its line reads "Prints on the in-house
  and requests reports and the confirmation."

**To back out:** drop `report_requests`, `report_guest_requests` and `stay_request_notes`;
restore `report_reservation_confirmation` from `0024`; delete the two report routes, the
`requests` entries in `report-nav.ts` and the Print Center, and the two Requests buttons;
restore `confirmation-body.svelte`.

## 3. Occupancy: a tab of its own

> *"They would like this new button to print to the 'Cancellation folio' and show on the
> 'In House' report, please."*

**Shipped.** Notes for reports has an **Occupancy** tab. It edits Access's
`room_assignments.occupancynotes`, which the In House report has always printed (its
"Occupancy Notes" column) but no screen could edit except by typing a note when recording
a move. One box per room; a stay with more than one room labels each box with the room and
its dates. The cancellation notice prints the occupancy notes in place of the reservation's
notes (`stay_occupancy_notes`: each different note once, in room order).

**Legacy evidence.** 11,327 rooms in Access carry an occupancy note, and they are messages
to the guest: "Please let us know who will be joining you", "ONE YEAR ONLY", "PLEASE
NOTE: Your dates will be later in 2027", "joining Laura Lukacs". The lodge's own sample
confirmation in `original_spec/reports/` (#115732) prints "Please note that Dec. 20th in
2026 will be the re-opening date…" under the room line. That text is the room's occupancy
note, not the reservation's notes, which are empty on that booking.

**Judgement call: occupancy notes also print on the confirmation**, under the rooms, as
Access printed them (Alvin, 25 Oct: "if the old system printed it then print it"). The
chart lists only the cancellation notice and In House. With the reservation note going
office-only, this keeps the lodge's guest messages on the confirmation. #115732 now matches
the original sample.

**Judgement call: the cancellation note.** The cancel dialog's "Cancellation note (prints
on the notice)" used to be added to the reservation's notes. Those no longer print, so it
is added to the occupancy notes of the stay's first room, the room the notice names, and
the label stays true. A stay with no room (the daily sales accounts) keeps it in its own
notes.

**To back out:** restore `cancel_reservation` and `report_cancellation_notice` from `0022`;
drop `set_occupancy_notes` and `stay_occupancy_notes`; remove the Occupancy tab from
`stay-notes-card.svelte`.

## 4. Reservation notes: office only

> *"They would like this field to be essentially a copy of the 'Guest Notes' that prints to
> nothing but shows on screen. It is information particular to that reservation ie:
> 'arriving late' and not a general comment about the guest."*

**Shipped.** The Reservation tab is gone from Notes for reports. **Reservation notes** is a
button on the Reservation details card that opens the same dialog as Guest notes ("Office
only — never printed."), with the same dot when there is a note. The confirmation and the
cancellation notice no longer print `resnotes`.

**Legacy evidence.** Access's `ResNotes` (14,712 bookings) are the office's record:
"equal billing", "3/26/26 can no longer come due to medical reasons…", "overcharged $1. at
c/out". Access printed them on the cancellation notice (the sample #109050 notice prints
"12/23/25 res cxl'd as per Woodward, Margaret is to call in to confirm cxl and give cc# for
refund"), and since `0003` this system printed them on the confirmation too. Both are
fixed.

**How it's built.** `guest-notes-dialog.svelte` became `notes-dialog.svelte`, taking a
title, the note, a placeholder and a save function, so both buttons share one dialog. The
reservation's placeholder is new copy: "Anything the office should know about this stay…".

**To back out:** restore the Reservation tab, and `reservation_notes` and the cancellation
notice's `resnotes` from `0024`/`0022`.

## 5. The cleanup pass

No feature changes and no screen wording changed beyond the notes above. Strings were
diffed before and after.

**Database (`0026`).**
- `archive_housekeeping_note` and `archive_kitchen_meal` are dropped. Nothing called them;
  the screens clear a note by saving it empty.
- The Daily Cash summary works out its two totals once instead of twice.
- Both guest documents read the latest deposit through one function
  (`latest_deposit_received`).
- `cancel_reservation` asks `reservation_deposit_held` instead of repeating it.
- A stale comment on `reservation_balance` is fixed.

**Import tools.** The mdb-export call written out twice is now one `export_insert_sql` in
`access_table_map.py`, and an unused name map and a source-schema branch that never matched
are gone. `seed.sql` and the full import regenerate byte-for-byte identical.

**App.**
- Dead code removed: an unused gift-certificate call, `createGuest`, unused UI-kit parts
  and theme variables, and unused parameters and fields.
- One `errorMessage` helper replaces the same expression written two dozen times.
- The confirmation, folio and bill are loaded one way for both the single document and the
  batch run (`guest-documents.ts`).
- The two deposit appendices are one component, and the "Agrees with Daily Cash" badge is
  another.
- The reservation screen went from 1,324 lines to about 530. Its dialogs are now
  components in `components/app/reservation/` (change dates, number of guests, room move,
  change room, undo move, the notes card). The ledger's four dialogs are now in
  `components/app/ledger/`.
- The rooms on the reservation screen now come straight from the page's data, which every
  save reloads. Before, a second copy was kept and refreshed by hand.
- The notes tabs read the housekeeping note in force from the database's own view instead
  of sorting the history in the browser.
- Shared pieces: `SegmentedToggle`, `RowAction`, `ReportDateInput`, and `party`,
  `roomWindow`, `stayNights`, `guestName` and `roomName` helpers.
- Not changed in behaviour, except one fix: a late room-rate reply can no longer overwrite
  the unit price after the clerk switches the charge to an item or closes the dialog.

**Spec and tests.** Stories that described one behaviour several times over were merged,
and each merged story's test went with it, its assertions carried into the survivor:
- the kitchen report's columns, which were seven stories;
- the guest page's fields, also seven, now `show-a-guests-details`, checked on the screen
  rather than by reading back what the fixture stored;
- the date search's modes and rows;
- the Daily Cash report's sections;
- the navigation, manual-sales and guest-history stories;
- paper sizes, print paths and the guest profile;
- on the notes side, `ensure-reservation-notes-feed-reports`, `keep-guest-notes-private`,
  `display-guest-notes`, `print-diet-and-housekeeping-notes-on-guest-documents` and
  `include-reservation-number-and-printed-dates` became `edit-the-notes-for-reports`,
  `keep-office-notes-private`, `print-notes-on-guest-documents` and the confirmation
  story.

`print-requests-reports` is new. A criterion stated in two stories now lives in one.

The weak tests listed in `docs/test-review-2026-09-29.md` are all fixed or removed, and that
document is gone. The tests now:
- assert exact values instead of `> 0`;
- fail on a missing row instead of passing over it;
- poll the screen instead of sleeping;
- check the rate is above zero before asserting taxes on it;
- check the import against the database instead of grepping the exporter's source.

Shared helpers in `tests/helpers/` (`useAppPage`, `pay`, `postRoomNights`, `postCharge`,
`cancel`, `roomWindows`, `dcarLine` and others) replace setup that was copied from file to
file. `tests/README.md` describes them.

**Judgement calls from the test review.**
- Two lines of one payment type on one stay come in no set order on the Deposits Received
  appendix; the test now says so rather than relying on one.
- `post-room-night-and-extra-charges` said a charge written "straight in the database" is
  priced the same way. A raw insert with no transaction type is refused by a not-null
  rule, so the story now says "through the database's posting function". If the database
  should fill the type in, that is a one-line default.
- `sell_gift_certificate` is covered by `business_logic_smoke.sql`. No screen calls it;
  that is open item 2 in `where-things-stand.md`.

**Docs.** `supabase/README.md` no longer keeps a migration-by-migration table or lists of
report functions, which go stale every round. It describes them instead, and records that
the hosted project is a test system, with production set up at go-live.
