# Changeset — the October Access file, imported and checked (round 20)

**Date:** 2026-10-31
**Trigger:** Alvin: *"please test the updated ms access db that i've added by importing it into
the local version and checking that everything is still in order. I don't think the structure
will have changed at all but the data should be more up-to-date?"*
**State:** the new file imported into the local stack; `npm run check` clean, and every feature
test and `business_logic_smoke.sql` passing on it. Then imported into the hosted project
(31 October, through the session-mode pooler): its row counts and checks match the local
import, and both logins work. It replaced the March copy there and the 28 bookings made during
the review.

---

## What was checked

- **Structure.** `legacy-db/YPLogicCurrentConsolidated.accdb` (31 October) against the March
  copy, now `YPLogicCurrentConsolidated-March.accdb`, table by table and column by column
  (`mdb-schema`), indexes and constraints included: the same, except that Access's
  reservation-board scratch table (`tblResBoard`) is gone. The import already left it in Access.
- **Rows.** Every row of every table the system uses loaded, counted against `mdb-export`. The
  payment-type list is one short by design: the retired ICS Crossover.
- **Links.** No stay, room, charge, payment or housekeeping note points at a missing record, no
  reservation number is repeated or missing, and the notes are plain text.
- **How current.** Bookings made up to 30 October, payments and charges up to 31 October, stays
  to October 2027.
- **31 October's date lists.** They show only the six Daily Sales accounts and the Rate Quoter.
  Access dates those to the current day every night, so they carry the copy's date (28 March
  in the March copy). The lodge has no other arrivals or departures that Saturday; its stays
  run Friday to Sunday (in 2025, 112 Saturday arrivals against about 1,500 each on Fridays and
  Sundays).
- **Setup the lodge changed in Access since March.** The seven R10 rooms' Double rate went from
  $254 to $256, typed over the same row; a dozen items were renamed, repriced or retaxed; two
  items are new (L100, x36); and there is a new tender, Discover.

The import ran first on an empty PostgreSQL 17 after every migration, with the smoke test, then
into the local stack.

## Changed

- `show-tender-types`: its test held the cash sheet to March's tender list. It now requires
  every payment type on file except the two that settle bills without money, with the lodge's
  established tenders among them.
- `docs/where-things-stand.md`: the open item on room charges posted at the Split rate is
  closed, since those charges were on the hosted test system, which the import replaced; the
  cash-sheet item names the new copy's date.

## Judgement calls

- **Discover prints on every Daily Cash sheet,** at $0.00 on a day without one, as every tender
  does (the story's "every tender type prints"). Access built its zero lines from a separate
  list, `tblPaymentTypeZero`, which the lodge didn't add Discover to, so its sheet showed
  Discover only on a day it was used. *To back out:* list Discover in `report_dcar_payments`
  only on a day it was used, as Gift Certificate is.
- **`seed.sql` stays as generated from the March file;** it isn't regenerated unasked.
  `python3 supabase/tools/generate_seed.py` refreshes it from the new file.
