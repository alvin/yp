# Changeset — front-desk input feedback (round 1)

**Date:** 2026-09-09
**Trigger:** ten items of written feedback from the lodge after the first period of live use, all under the heading "Items to do with *Input*".
**State:** 114 stories, 113 feature test files (one story still `@status:backlog`), 372 tests passing. `npm run check` clean, production build clean, `business_logic_smoke.sql` passing.

## What this document is for

Each numbered item below records **what the client asked**, **what shipped**, **where it lives**, **the judgement calls made**, and **how to back it out**. If a revision lands badly, start from the relevant section and reverse only that one — none of the ten depend on each other, and the back-out notes say what else moves if you pull a thread.

Three things in here were *not* asked for by the client and were corrections demanded mid-build; they are recorded in [Mid-build corrections](#mid-build-corrections) so a later session does not reintroduce them.

---

## Delivery summary

| Area | Change |
|---|---|
| Database | one new migration, `supabase/migrations/0008_input_refinements.sql` |
| Spec | 9 new stories, 2 updated (105 → 114) |
| Tests | 9 new test files, 2 extended |
| App | 3 new shared components, 3 new lib modules, 7 screens/components touched, `ui/select` removed |

New DB objects in `0008`:

```
ypl.search_pattern(text)                 ypl.search_guests_by_name(text, int)   [replaced]
ypl.search_patterns(text)                ypl.search_all_fields(text)            [replaced]
ypl.guest_co_names(int)                  ypl.archive_transaction(int)           [replaced]
ypl.reservations_sync_room_dates()       ypl.archive_payment(int)               [replaced]
ypl.reservations_sync_guest_dates()      [replaced]
trigger reservations_sync_room_dates on ypl.reservations
```

**Deploy:** `0008` is applied locally only. Staging/production need it before the app is deployed — the `run_remote_sql.py` command in `supabase/README.md` already lists it.

---

## 1. Item list should filter by code and be alphabetised

> *"at the moment it pops up as the full list and must be scrolled all the way to the bottom. Could we start entering the 'item code' ie; type 'L' and the liquor items are returned, 'X' for sundries, etc. Could it also be alphabetized by the code letters?"*

**Shipped.** Every dropdown in the app is now `app/src/lib/components/ui/combobox/` — a select button that opens a popup with a search box at the top. Typing narrows by case-insensitive substring; entries *starting* with what was typed are listed first, so `L` brings the liquor codes to the top. Items load and sort in item-code order (`reference.ts` orders by `invcode`, `inventory.ts` re-sorts client-side so collation can't change it).

**Where:**
- `app/src/lib/components/ui/combobox/{combobox.svelte,filter.ts,index.ts}` — the component and the pure `filterOptions` used by tests
- `app/src/lib/options.ts` — builds option lists (`textOptions`, `roomOptions`, `itemOptions`, `paymentCategoryOptions`, `tenderTypeOptions`, `currencyOptions`)
- `app/src/lib/inventory.ts` — `itemLabel`, `compareByCode`, `sortItemsByCode`
- 19 call sites across 6 files; `app/src/lib/components/ui/select/` deleted (nothing imported it)
- Story `spec/features/find-charge-items-by-code.feature`, test `app/tests/features/find-charge-items-by-code.test.ts`

**Judgement call — substring, not code-only.** Typing `L` returns everything containing an "l" anywhere, with the L-codes on top; it does not return *only* liquor. This follows from "search by substring" and keeps one predictable rule. If the client wants a 1–2 character entry to match codes only, that is a two-line change in `filter.ts`.

**To back out:** revert `filter.ts` to plain `includes` (drops the prefix ranking), or restore `ui/select` from git history and revert the 19 call sites. The item-code *ordering* is independent — it lives in `reference.ts` + `inventory.ts` and can stay either way.

---

## 2. No way to remove a mistakenly charged item

> *"If an item is charged mistakenly, we can't find a way to remove or delete it."*

**Shipped.** A remove action on every row of the reservation's Transactions panel — charge lines *and* payment/deposit lines — with a confirm dialog naming the line, its date, code and amount.

**Where:**
- `app/src/lib/components/app/reservation-ledger.svelte` — row action, confirm dialog, `confirmRemove()`
- `app/src/lib/data/mutations.ts` — `archiveTransaction`, `archivePayment`
- `0008` — `archive_transaction` / `archive_payment` now raise when the line is already gone instead of silently doing nothing
- Story `spec/features/remove-a-charge-entered-in-error.feature`, test `.../remove-a-charge-entered-in-error.test.ts`

**Judgement call — payments are removable too.** The literal ask was about charges. Verified against the Access original (see [Legacy evidence](#legacy-evidence)): staff deleted **payment** lines from live bookings more than three times as often as charge lines (7 vs 2 in the observable window), and Access offered *no* edit path for payments, so delete-and-re-enter was the only correction available. Restricting the trash to charges would be a capability loss, not a simplification.

**Judgement call — soft delete where Access hard-deleted.** The row is flagged `transarchive` / `paymentarchive` rather than deleted. This was not a deliberate divergence: `archive_transaction`/`archive_payment` and the whole `*archive`-as-"not active" convention predate this changeset (`0005`, `0003`), and 41 of the 43 places that read `transactions`/`payments` already filtered on those flags. Verified end-to-end that the observable result is identical to a hard delete — ledger, balance, folio, checkout bill, deposits received, cashier detail, items cashed out and DCAR all drop the line. Manual Sales still lists the row because that report is a blank sheet of *occupied rooms* and carries no charge data.

*Residual risk:* a future query written over `transactions`/`payments` without the archive filter would resurrect removed lines. A hard delete would make that structurally impossible. All current consumers filter.

**Known gap, deliberately not built.** Access's *designed* correction path was editing a line, not deleting it — six dedicated forms (`frmChangeAmountRoom`, `frmChangeAmountInventory`, `frmUpdateQuantityOptions`, + `…Guest` variants) and ~20 update queries. This app has no `update_transaction` / `update_payment` RPC, so a posted line still cannot be edited. Proposed and **explicitly declined** in this round. If the client comes back asking to *fix* a line rather than remove it, that is the feature to build, and it is roughly the size of item 3.

**To back out:** drop the `{#if !readonly}` remove column and the remove dialog from `reservation-ledger.svelte`. Leave `0008`'s not-found errors — they are harmless. To restrict to charges only, guard `askRemove` on `line.line_source === 'transaction'`.

---

## 3. No way to change the dates of an existing reservation

> *"We also can't find a way to change the dates of an existing reservation if someone extends or shortens their stay."*

**Shipped.** "Change dates" in the reservation action bar, opening a dialog with arrival/departure. The reservation keeps its number, guests and rooms; the DB recomputes the night count and re-checks the booking rules.

**Where:**
- `app/src/routes/reservations/[resnumber]/+page.svelte` — button, dialog, `saveDates()`
- `app/src/lib/data/mutations.ts` — `updateReservation(reservationid, changes)`, wrapping the pre-existing `ypl.update_reservation`
- `0008` — new trigger `reservations_sync_room_dates` carries room assignments with the stay; `reservations_sync_guest_dates` rewritten as a single statement so a whole-stay shift can't pass through a state where check-out precedes check-in
- Story `spec/features/change-the-dates-of-an-existing-reservation.feature`, test `.../change-the-dates-of-an-existing-reservation.test.ts`

**Behaviour worth knowing:** only occupancy windows that ran to the reservation's *own* dates move. A mid-stay room-move window keeps its own dates. Charges already posted are **not** adjusted — that matches the Access original, where `qryUpdateReservationDates` / `qryUpdateReservationGuestDates` / `qryUpdateReservationNights` moved the stay but historical transaction rows stood.

**To back out:** remove the button + dialog from the reservation screen. The DB trigger can stay (it only fires on a date change and keeps rooms consistent for direct Supabase edits too) — or `drop trigger reservations_sync_room_dates on ypl.reservations;` to remove it fully.

---

## 4. Name search returns too few, and misses `-illington`

> *"a limited number of reservations is returned. Could this list be larger and scrollable? Ie: when I enter the partial string '-illington' it doesn't return 'Shillington'."*

**Shipped.** Two separate things:

- **Placeholder punctuation is ignored.** `ypl.search_pattern` trims leading/trailing ` -–—.,;:_*%` from each keyword, honours `*` as a wildcard, and escapes literal LIKE metacharacters so a stray `%` can't match the whole table. `-illington` now finds `Shillington`.
- **The list is bigger and scrolls.** Cap raised from 8 to `NAME_SEARCH_LIMIT = 100` (`queries.ts`), shown in a `max-h-80` scrolling panel.

**Where:** `0008` (`search_pattern`, `search_patterns`, `search_guests_by_name`), `app/src/lib/data/queries.ts`, `app/src/lib/components/app/guest-search.svelte`. Stories `search-guests-by-partial-name.feature` and `return-more-name-matches-in-a-scrollable-list.feature` with matching tests.

**Performance measured on the full dataset** (≈19k guests, ≈31k reservations): 38–102 ms for every query tried, including single-letter searches.

**To back out:** lower `NAME_SEARCH_LIMIT`; or revert `search_pattern` to `'%' || p_query || '%'` to restore literal matching.

---

## 5. All-fields search should take multiple keywords

> *"Could the 'all fields' search handle multiple keywords? Ie: could we enter 'Karen' and 'Abbotsford'?"*

**Shipped.** `ypl.search_all_fields` rewritten: the entry splits on whitespace and a record is returned only if it carries **every** keyword, though each may land in a different field. Each record comes back **once**, with `matched_on` / `detail` naming the fields that matched. Verified with the client's own example — `Karen Abbotsford` returns 2 guests, `matched_on = 'name, address'`.

Searchable fields: guest name, company, primary phone, secondary phone, address block, email; reservation number and group name. Archived reservations are now excluded (they weren't before).

**Where:** `0008`; `spec/features/run-all-fields-search.feature` gained three ACs; `app/tests/features/run-all-fields-search.test.ts` gained three cases.

**To back out:** restore the previous `search_all_fields` from `0003_views_and_reports.sql`. The screens need no change — the row shape is unchanged.

---

## 6. Name search should include the second name on a reservation

> *"Could the lookup screen 'name' search also include the second last name, if any? Ie; if the reservation is under two people's names, partners, etc."*

**Shipped.** Two mechanisms:
- Real double surnames in one field already worked (`SHILLINGTON GAMBLE` is found by "Gamble") and still do.
- Where a stay carries a second `reservation_guests` row, searching either name now returns **both people**. The co-guest is flagged `match_kind = 'shared reservation'` and sorted after direct matches; every row carries `other_names` (via `ypl.guest_co_names`), shown as "with …" under the name.

**Where:** `0008` (`search_guests_by_name`, `guest_co_names`), `app/src/lib/data/types.ts` (`GuestSearchRow` gained `match_kind`, `other_names`), `guest-search.svelte`. Story `include-second-reservation-name-in-guest-search.feature`.

**Judgement call — this returns other people's rows, not duplicates.** Verified: one row per guest (`search_guests_by_name('smith', 100)` → 100 rows, 100 distinct guests). The cost is noise: search a common surname and everyone who has shared a stay with any match also appears. Bounded — direct matches cap at `p_limit`, co-guests are drawn only from that capped set, whole result caps at 2×. **On current data the expansion adds nothing**: only 7 of 30,432 reservations carry a second name, so `search_guests_by_name('a', 100)` comes back 100/100 `match_kind: name`. It grows only as staff use "Add guest".

**To back out:** delete the `shared` CTE from `search_guests_by_name` and the `case … 'shared reservation'` expression. Keep `other_names` for context if wanted; the UI handles either.

---

## 7. New-reservation name lookup needs partial search

> *"Could the 'name look up' on 'new reservation' also have the 'partial field' search function? … At the moment, the whole name has to be spelled correctly."*

**Shipped.** All four guest lookups now use one component, so they cannot drift apart: lookup home, new-reservation guest panel, add-a-name dialog on the reservation screen, and the Print Center's reprint-by-guest.

**Where:** `app/src/lib/components/app/guest-search.svelte`; call sites in `routes/+page.svelte`, `routes/reservations/new/+page.svelte`, `routes/reservations/[resnumber]/+page.svelte`, `routes/print/+page.svelte`.

**Note on the original report:** the new-reservation lookup was already calling the same RPC. What actually blocked them was item 4's substring handling plus a 6-result cap. The shared component is the durable fix.

**To back out:** the component is a straight replacement for four near-identical inline blocks; reverting means restoring those blocks from git history.

---

## 8. Deposits at booking and re-book time

> *"When either creating a new reservation or producing one via the 're-book' function, we'll need the 'items to be charged' function added so we can record any deposit or pre-payment. Otherwise we have to make a new reservation, then call it up (shows 'deposit - $0.00) and add the charge via an extra step."*

**Shipped.** A "Charges & deposit" panel on the new-reservation screen and inside the re-book dialog. Lines are held on screen, reviewable and removable, then posted through the ordinary workflow RPCs once the reservation exists.

**Where:**
- `app/src/lib/components/app/charge-basket.svelte` — the panel
- `app/src/lib/pending-charges.ts` — line types, `pendingLineAmount`, `postPendingLines`
- `routes/reservations/new/+page.svelte` (`save()`), `routes/reservations/[resnumber]/+page.svelte` (`doRebook()`)
- Story `record-charges-and-deposits-while-booking.feature`, test `.../record-charges-and-deposits-while-booking.test.ts`

**Behaviour worth knowing:**
- Held lines are posted with **today's** business date, not the arrival date, so a deposit taken at booking lands on today's Daily Cash Activity Report.
- If posting fails *after* the reservation is created, the reservation still stands; the toast reports what didn't land and the clerk is taken to the reservation to finish there. It never double-creates.
- On re-book, the transferred deposit and the newly entered lines both land on the new stay.

**To back out:** remove the `<ChargeBasket>` from both screens and the `postPendingLines` calls from `save()` / `doRebook()`. `pending-charges.ts` becomes dead and can be deleted.

---

## 9. Street address not populated for a returning guest

> *"When an existing guest was returned to the 'new reservation' screen, the 'street address' fields weren't populated."*

**Shipped.** A straight bug fix. `attachSearchRow()` was filling only the fields carried by the search row (name, city, region, phone, email). It now loads the full guest record and fills salutation, company, street address, postal code and country as well.

**Where:** `routes/reservations/new/+page.svelte`. Story `attach-an-existing-guest-to-a-new-reservation.feature`, test `.../attach-an-existing-guest-to-a-new-reservation.test.ts`.

**To back out:** don't. This one is a defect fix with no judgement call in it.

---

## 10. Housekeeping and diet notes when booking

> *"We'd also like to be able to add housekeeping and diet notes at the 'new reservation' level. That's usually when they tell us all that stuff."*

**Shipped.** A "Housekeeping & diet" card on the new-reservation screen: diet (from the lodge's diet list), diet/allergy notes, housekeeping notes. On save these are written to `kitchen_meals` and `housekeeping_notes` exactly as notes added later are, so they reach the kitchen and housekeeping reports with no further step. Blank fields write nothing.

**Where:** `routes/reservations/new/+page.svelte`, using the existing `saveKitchenMeal` / `addHousekeepingNote` mutations. Story `capture-housekeeping-and-diet-notes-when-booking.feature`, test `.../capture-housekeeping-and-diet-notes-when-booking.test.ts`.

**To back out:** remove the card and the two save blocks from `save()`.

---

## Not asked for, but changed

- **`spec/features/keep-data-consistent-for-direct-database-edits.feature`** gained one AC and one test case, covering the new room-date cascade for rows edited directly in Supabase. Belongs with item 3.
- **`supabase/tests/business_logic_smoke.sql`** gained a date-change section and a line-removal section, plus two multi-keyword search calls.
- **`app/src/lib/components/ui/select/`** deleted — the combobox replaced its last caller.
- **`CLAUDE.md`** created (see below).
- **READMEs** updated: feature count 105 → 114, migration `0008` added to `supabase/README.md`'s contents/order/deploy command and its RPC and trigger documentation, `app/README.md` wiring section updated.

---

## Mid-build corrections

Three rounds of rework happened inside this changeset because the first attempt was wrong. Recorded so a later session doesn't undo the correction.

**1. Product copy narrating the change.** The first build added helper text explaining the new behaviour — *"Matches any part of a name — first, last, second surname, or company — and the other names a stay is booked under"*, placeholders quoting the client's own bug report (`-illington`, `Karen Abbotsford`), a paragraph explaining when held charges post. All of it was stripped. Every pre-existing string on the Lookup, All-fields, Query results and Print Center screens is now byte-identical to before; new surfaces carry a label plus at most one short factual line. The rule is written into `CLAUDE.md` — **the UI is for the front desk, not a changelog**; rationale goes in code comments, the story's ACs, the READMEs and this file.

**2. A bespoke item picker instead of a dropdown.** The first build replaced the item `Select` with a permanently-expanded inline list with per-row checkmarks — novel, space-hungry, and it read as multi-select. Replaced with the combobox described in item 1: same button trigger as the old dropdown, search box in the popup, checkmark only on the selected row. Applied to all 19 dropdowns rather than just items. `CLAUDE.md` now says to reach for the shared combobox rather than hand-rolling a picker.

**3. Scaffolding with no caller.** A pre-commit sweep removed the parts of the first build that nothing reached: a `notes` field on the held charge/deposit lines that was always empty (`pending-charges.ts`, `charge-basket.svelte`), a `limit` argument on `searchGuestsByName` no caller passed, an `emptyText` prop on the combobox no call site overrode, an identity `MODES.map` on the lookup screen, and two unused exports (`compareByCode`, the `filterOptions` re-export). The payment/tender/funds option lists, duplicated verbatim in `reservation-ledger.svelte` and `charge-basket.svelte`, moved into `options.ts` where the other option builders already live. Three code comments that narrated the fix rather than the code ("no longer needs a second visit", "no second trip through the reservation", "so the clerk does not have to come back for it") were cut to what the code does — the `CLAUDE.md` rule applies to comments as much as to screens. Behaviour is unchanged: the same 372 tests pass.

---

## Legacy evidence

Several judgement calls above were settled against the Access original (`legacy-db/YPLogicCurrentConsolidated.accdb`, read with `mdbtools`, plus the imported production data). Recorded here so it doesn't have to be redone.

- **"Archive" in Access meant the retention purge, not correcting a line.** `application_information.archivecomments`: *"In Aug 2023, we archived all Reservations with an Arrival Date on or before June 2022."* Implemented as paired queries — `qryAppendTransactionArchive` → `qryDeleteTransactionMaster`, and the same for Payment, Reservation, ResGuest, Occupancy, Housekeeping, Shuttle.
- **The `*archive` boolean columns are effectively unused in the source data** — 2 of 55,786 transactions, 1 of 76,671 payments.
- **The `*_backup` tables are a complete point-in-time snapshot** (0 live rows in their id range are missing from them), so rows present there and absent from live were deleted afterwards: 21 transactions, 23 payments, 6 reservations. Of those, the ones whose booking still exists — i.e. genuine line-level deletions rather than cascades — are **2 charge lines and 7 payment lines**.
- **Deletion was not a designed feature**; there is no per-line delete query. It came from Access's stock datasheet row-delete on `fsubReservationTransaction` / `fsubReservationPayment`.
- **Editing was a designed feature**: `frmChangeAmountRoom`, `frmChangeAmountRoomGuest`, `frmChangeAmountInventory`, `frmChangeAmountInventoryGuest`, `frmUpdateQuantityOptions`, `frmUpdateQuantityOptionsGuest`, backed by ~20 `qryUpdate*` queries including `qryUpdateTransAmount`, `qryUpdateTransactionQuantity`, `qryUpdateQuantityInventory{,Guest}`, `qryUpdateQuantityRoom{,Guest}`.
- **Access had no audit trail either** — no created/updated-by columns on `transactions` or `payments`, and no change-log table. Our lack of attribution on a removal is parity, not a regression.
- **Changing stay dates was a designed feature**: `qryUpdateReservationDates`, `qryUpdateReservationGuestDates`, `qryUpdateReservationNights` — matching item 3, including the cascade to reservation-guest dates.

---

## Verification

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0008_input_refinements.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/business_logic_smoke.sql
cd app && npm run check && npx vitest run && npm run build
```

At the time of writing: 372 tests across 113 feature files plus the coverage-map meta-test, 0 type errors, build clean. `app/tests/coverage-map.test.ts` enforces the 1:1 story ↔ test mapping, so removing a story means removing its test file and vice versa.
