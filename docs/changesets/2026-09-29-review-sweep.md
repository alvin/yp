# Changeset — review sweep: one rule each, room rates, notes, cruft (round 6)

**Date:** 2026-09-29
**Trigger:** a four-part read-only review of the app, the test suite, the stories
and the database, and the owner's decisions on each finding.
**State:** `npm run check` clean, every feature test passing, production build
clean, `business_logic_smoke.sql` passing. `0014` and `0015` applied to the
local stack; not yet applied to the hosted project.

## What this document is for

The same shape as rounds 1–5: what was decided, what shipped, the judgement
calls, and how to back each out. Unlike earlier rounds this one came from a
review, not from lodge feedback; the lodge-facing effects are listed first.

**Deploy order:** apply `0014` then `0015` to the hosted project (one
`begin … commit`) **before** the app ships. The app calls `guests_in_house`,
`reservation_deposit_held` (through `v_reservation_summary.deposit_held`) and
the three-argument `effective_room_rate`/`post_room_nights`; `0014` drops
`report_kitchen_meal_total_guests`, which the current live app calls.

---

## What the lodge will notice

| Where | Change |
|---|---|
| Add charge → Room night | A **Rate** choice — Regular, Special, Split — starting on Regular. The price shown and posted follows it. |
| New reservation → Room | Once the dates are in, a room another stay holds for any of those nights shows **Booked**. It can still be chosen. |
| Confirmation (and cancellation notice) | Re-booking no longer writes "Re-booked from #…" into the reservation notes, which print for the guest. |
| Reservation → Notes for reports | Kitchen, Housekeeping and Requests edit the primary guest's own current note. They no longer load every note joined together and save it back. Kitchen shows the diet above the notes. The Kitchen and Housekeeping lines now say they print on the confirmation and check-in folio too. |
| Cancel dialog | Shows the deposit still held (received, less refunded, applied or kept), not the first deposit received. |
| Date search | The deposit column is the deposit still held. A room removed from a stay no longer puts the stay in the In house results. |
| Kitchen/Meal report | Total Guests counts a party that moves rooms once, as the In House report already did. |
| 7-day kitchen report | A diet record with neither a diet nor notes is no longer listed. |
| Daily Cash report | A payment type or charge category not on the lodge's lists gets its own line, so the lines always add up to the totals. |
| Printed reports | "Page N of M" on every page of a daily report, as the originals printed it; the old fixed "Page 1 of 1" is gone. Guest documents and the batch run are unnumbered. |
| App footer | "Copyright © <year> Yellow Point Lodge". |
| Screen copy | Eleven lines that explained behaviour or narrated changes were removed or cut to the fact (see *Copy*). |
| Reservation → guest names | The "In house" badge beside a guest name is gone: it read a flag nothing has set since the Access import. |

---

## 1. One rule each (`0014_one_rule_each.sql`)

The reporting layer had the same rules written several times, drifting apart.
Each is now one database object read everywhere it applies:

| Rule | Now | Replaces |
|---|---|---|
| Rooms touched on a day or range | `rooms_held(p_from, p_to, p_include_cancelled)` | separate filters in the housekeeping, In House and manual sales reports, the kitchen total and both date searches — the searches didn't exclude removed rooms at all |
| Guests in house | `guests_in_house(p_date)` | `report_kitchen_meal_total_guests` (dropped; counted a moving party twice) and the sum the In House screen did itself |
| Deposit still held | `reservation_deposit_held`, `v_reservation_summary.deposit_held` | the date search's received-minus-refunded sum and the cancel dialog's first deposit line |
| Current housekeeping note | view `v_current_housekeeping_notes` | copies in `report_housekeeping` and `stay_housekeeping_notes` |
| Diet records that count | view `v_kitchen_diets` | copies in `report_kitchen_meal`, `report_kitchen_meal_filtered` and `stay_diet_notes` |
| A charge's daily cash category | `charge_category(invtype)`, used by `post_charge` | a map in the app only; a charge posted straight to the database wrote "Red Wine" instead of "Liquor" |
| Daily cash lines | `report_dcar_payments`, `report_dcar_upper` list every type/category present | lines from the lookup lists only — 6 Sep 2024's two Discover payments had no line |

**Judgement call — two occupancy rules stay separate.** Reports and searches
ask which rooms are *touched* on a day (both ends of a window count).
Availability and room sharing ask who holds a room *overnight* (a room left on
the 5th is free for an arrival on the 5th). Different questions; each keeps its
rule, and `rooms_held`'s comment says so.

**Verified before and after on the full local data** (every report and search
over 89 dates, every reservation's guest documents): identical except for
the intended changes — 28 blank rows gone from the 7-day kitchen report, the
deposit column lower on 1,573 stays (each has a deposit applied or kept), one
new Discover line, and 48 Total Guests values lower by exactly the moving
parties that were double counted.

**Also in `0014`:**
- `archive_transaction`/`archive_payment` now raise on an already-removed line, as the README and the remove-a-charge story always said they did. `archive_housekeeping_note`/`archive_kitchen_meal` raise on a wrong or removed id.
- The confirmation and cancellation notice take their first room from `report_stay_rooms` (live rooms only), as the folio already did; `report_stay_rooms` excludes a removed guest name's rooms.
- Dropped, after an assessment of each: `set_guest_in_house` (set a flag nothing reads), `archive_room_assignment` (could leave a stay with no room; superseded by `undo_room_move`), `archive_reservation_guest` (could archive the primary guest), `set_updated_at` (attached to no trigger).

**To back out:** restore each function from the migration that last defined it
before `0014` (`0003`, `0005`, `0006`, `0010`, `0011`, `0012`, `0013`),
recreate `report_kitchen_meal_total_guests` from `0005`, and revert the app's
`guestsInHouse`, `deposit_held` and `roomsBooked` callers.

## 2. Room rates by type (`0015_room_rate_type.sql`)

Asked: "look at what the MS Access solution does for this and ensure we are not
out of sync."

**Access** (from `legacy-db/YPLogicCurrentConsolidated.accdb`: `frmChooseRoomRate`,
`qryCalcRoomRate`, `qryUpdateTransaction2`) posts one line per room window,
nights × one rate, the rate read on the charge's own date — never a
night-by-night blend. That already matched. The 122 imported stays that run
from December into January each carry a single rate.

**The mismatch was the rate type.** Every room has a Regular, Special and Split
rate; Access made the clerk pick one. `effective_room_rate` ignored the type and
took the newest row — the Split rate for 58 of 64 rooms, half the Regular rate
for Lodge 01. It now takes the type (Regular by default); `post_room_nights`
passes it; the charge dialog offers it.

**To back out:** restore both functions from `0005` and remove the Rate combobox
from `reservation-ledger.svelte`.

## 3. Notes on guest documents

Owner's direction: diet and housekeeping notes print on the client-facing
documents; internal notes never do.

- **Reservation notes stay guest-facing.** The original Access confirmation printed them, and the lodge writes guest messages there ("Please note that Dec. 20th … re-opening date"). What was internal was the "Re-booked from #…" reference the app wrote into them; re-booking no longer does.
- **Office notes never print**, now tested for all four guest documents: guest notes, request notes and room notes.
- **The notes tabs** used to show every guest's notes joined and save them back to the primary. Kitchen saved "diet — notes" into the notes, so the diet printed twice. Housekeeping saved the whole history as a new note, which then printed. Each tab now edits the primary guest's own current text only.

## 4. Copy

Removed or cut to the fact: "Room moves can be added later from the
reservation." · the guest-notes toast is "Guest notes saved" · "Used by reports
that accept a range." · "Matches any part of a name — first or last." · the
"(e.g. "adam")" placeholder → "Start typing a name…" · the repeated all-fields
helper line · the all-fields page's description · "Bed layout shown beside each
room." · the "Res # assigned on save" badge · "The lodge books only one year
ahead." (the latest arrival date stays) · the batch page's "Pick another date
above." (its empty state could not occur and is gone).

## 5. Cruft and duplication

- **Removed:** the app-side tax calculation and its tax-rate query, the room-type and transaction-type lists (two sign-in queries nothing read), unused types and formatters, the unused separator component, the unused `@sveltejs/adapter-auto` dependency, dead component options and branches, two status labels no caller produces, the batch page's `?include=` option, the ledger re-deriving a running balance the database already returns, four unused report styles, a stale "mock layer" comment, an unused test helper and import.
- **Consolidated:** the guest-document letterhead (four copies → `guest-letterhead.svelte`, verified pixel-identical on 20 documents), the lodge phone (`LODGE_PHONE`), the guest-document list (`GUEST_DOCUMENTS` in `report-nav.ts`), the guest-notes dialog (`guest-notes-dialog.svelte`), and hand-formatted money (now `money()`).

## 6. Spec and docs

- **Stories** brought back in step with the app, including behaviour decided in earlier rounds. Eleven near-duplicate pairs merged, every assertion kept or folded in. Garbled boilerplate fixed ("So that so that", "As a user", "Given when").
- **CLAUDE.md** now says the spec is maintained as carefully as the tests, and that docs never state code-level counts or inventories. Counts removed from the READMEs; the Supabase README's migration list and deploy command are globs.
- **`features/` removed** (the client's original pack, superseded by `spec/features/`), with every reference to it in `original_spec/`. Questions still open in its `.questions` files, recorded here so they aren't lost:
  - Daily cash: does the weekly spreadsheet handoff need app support? Should DCAR actual amounts, staff-tip codes and manual adjustments be stored, and against which accounting codes?
  - Name search: how should a stay with several named occupants show on the guest side?
  - Print screen: the prompt flow for printing or reprinting a single document versus all of a type.
  - Printed outputs: pixel copies of the Access layouts, or matching data, wording, sections and paper?
  - Transaction screen: split-bill handling beyond `percentageofbill`; moving a deposit when a stay is cancelled or re-booked.

---

## Open items

Kept in one place: `docs/where-things-stand.md`.
