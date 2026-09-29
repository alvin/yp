# Changeset — notes on guest documents, room rate in the charge dialog (round 4)

**Date:** 2026-09-28
**Trigger:** two items of written feedback from the lodge after using round 3.
**State:** 123 stories, 122 feature test files (one story still `@status:backlog`), 448 tests passing. `npm run check` clean, `business_logic_smoke.sql` passing. `0011` applied to the local stack; **not yet applied to the hosted project.**

## What this document is for

The same shape as rounds [1](2026-09-09-front-desk-input-feedback.md),
[2](2026-09-10-rebook-is-next-years-reservation.md) and
[3](2026-09-17-front-desk-output-feedback.md): what was asked, what shipped,
where it lives, the judgement calls, and how to back each one out. The two items
are independent.

---

## Delivery summary

| Area | Change |
|---|---|
| Database | one new migration, `supabase/migrations/0011_guest_document_notes.sql` |
| Spec | 1 new story, 1 updated (122 → 123) |
| Tests | 1 new test file, 1 extended (437 → 448 tests) |
| App | 2 report bodies, the reservation ledger, 1 query, 2 types, `report.css` |

New DB objects in `0011`:

```
ypl.stay_diet_notes(int)           ypl.report_reservation_confirmation(int)  [replaced, 2 columns appended]
ypl.stay_housekeeping_notes(int)   ypl.report_check_in_folio(int)            [replaced, 1 column appended]
```

**Deploy:** add `migrations/0011_guest_document_notes.sql` to the
`run_remote_sql.py` command in `supabase/README.md` (already listed there) and run
it against the hosted project. Until then the hosted app prints the
confirmation and folio as before; the new columns are simply absent.

---

## 1. Diet and housekeeping notes on the confirmation and the check-in folio

> *"Could you please double check the printing of the Housekeeping and Kitchen comment fields to the Confirmation and Check-in folios? I think I was less than perfectly clear on my first feedback round. We would like these fields, (ie; '1 vegan' or 'split beds') to appear on both the confirmation and check-in folios. That way, guests can catch any issues when they get their confirmation and are confirming their requests when they sign their for when they check in."*

**What round 3 had done.** Round 3's item 1 asked for "especially diets" on the
*check-in* folio, so the diet went on the folio only. Housekeeping notes were on
neither document, and the confirmation carried neither note.

**Shipped.** Both documents print `Diet:` and `Housekeeping:` lines when the stay
has them. Neither line prints when it is empty.

**Where:**
- `0011` — `stay_diet_notes`, `stay_housekeeping_notes`; `report_reservation_confirmation` gains `diet_notes` and `housekeeping_notes`; `report_check_in_folio` gains `housekeeping_notes` and reads its diet from the new helper
- `app/src/lib/components/reports/confirmation-body.svelte`, `check-in-folio-body.svelte`, `app/src/lib/report.css`, `app/src/lib/data/types.ts`
- Story `spec/features/print-diet-and-housekeeping-notes-on-guest-documents.feature`, test `app/tests/features/print-diet-and-housekeeping-notes-on-guest-documents.test.ts`

**Judgement call — each note reads the record its report reads.** The diet is
the kitchen report's wording (diet, then diet notes, every guest on the stay).
The housekeeping note is the housekeeping report's: the *latest* note per guest
on the stay, not every note ever filed. A stay whose note was revised ("twin
beds" then "split beds") prints only "split beds", which is what housekeeping
will act on. If the client wants every note, the `limit 1` in
`stay_housekeeping_notes` is the line to drop.

**Judgement call — the notes take their room from the blank space, not the page.**
The folio and confirmation carry deliberate blank gaps from the originals
(120px above Vehicle; 190px above the office-hours paragraph). Printed as extra
lines, the notes pushed 9 of the 40 heaviest-noted upcoming stays onto a second
A5 sheet — the folio's signature line landing on page 2. The notes now sit
inside that gap (`.notes-room`, a minimum height equal to the gap) and the line
after them drops its own gap. Measured against the committed layout on the same
stays: those 9 now print on one sheet; one folio that round 3's diet line had
already pushed to two pages is back to one; stays with no notes render
pixel-identical. The 330px signing space on the folio is untouched.

**Known edge — one confirmation still runs to two pages.** #115059 has a five-guest
diet typed as separate paragraphs, so it prints with a blank line between each.
Its folio was already two pages before this round. Collapsing blank lines on the
guest documents (a `regexp_replace` in `stay_diet_notes`) would fix it and
shorten every multi-guest diet, but the kitchen report prints those blank lines
too, so it was left as the lodge wrote it.

**Not a privacy change.** `keep-guest-notes-private` concerns the guest record's
office notes (`set_guest_notes`); those still print nowhere. Diet and
housekeeping notes were always report-feeding.

**Verified:** across all 31,123 reservations, every column the two documents
already returned is identical before and after `0011`.

**To back out:** restore `report_reservation_confirmation` from `0006` and
`report_check_in_folio` from `0010`; revert the two report bodies and the
`.notes-room` rule. The two helpers can stay; nothing else calls them.

---

## 2. The room rate shows in the charge dialog before posting

> *"When a 'room charge' is being posted to a folio in the 'transaction' screen, the correct amount appears on the actual folio, but the dialog box shows a '0.00' value. … if it's easy to have the selected room rate show in the 'room charge' dialog window before posting the charge, that would be a bit smoother."*

**Why it showed 0.** The dialog's Unit price started at 0 for room nights, and 0
meant "let the database price it": `post_room_nights` fell back to
`effective_room_rate(room, date)`. The posted amount was right; the dialog just
never showed the figure.

**Shipped.** Choosing Room night, a room, or a date looks up that same
`effective_room_rate` and fills Unit price with it. The clerk can type over it
and the typed price is what posts. No copy changed.

**Where:** `app/src/lib/components/app/reservation-ledger.svelte`,
`effectiveRoomRate()` in `app/src/lib/data/queries.ts`. Story
`post-room-night-and-extra-charges.feature` gained one criterion; its test
drives the dialog in the browser.

**Judgement call — the rate is for the charge date, not today.** It is the rate
`post_room_nights` would have used, so the number shown is the number that
would have posted before this change.

**Judgement call — changing room or date replaces a typed price.** Picking a
new room means a new rate; a typed override survives everything else. A slow
earlier lookup can't overwrite a newer one.

**Side fix:** switching from Room night to Item / extra now shows the chosen
item's price (or 0 with none chosen) rather than carrying the room rate over.

**Not changed:** the dialog still opens on the first room in the lodge list, not
the room the stay is in. Defaulting to the stay's room is the obvious next
smoothing if the client wants it.

**To back out:** remove the `$effect` and the Item / extra `onclick` addition in
`reservation-ledger.svelte`. Posting behaviour is unchanged either way.
