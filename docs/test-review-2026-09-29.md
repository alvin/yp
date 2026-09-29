# Weak tests — for review

From the 2026-09-29 review of the feature suite, re-checked against the current
tree. Every file below exists and runs green today; each entry is a way a real
regression could still pass. Nothing here has been changed. Tests the review
flagged that were fixed or merged since are not listed.

Paths are `app/tests/features/<name>.test.ts` unless given in full.

## A. Obvious fixes — the test can pass without the behaviour

| Test | Problem | Fix |
|---|---|---|
| `assign-ledger-responsibility` — second guest's balance | `Number(b2?.balance_owing)` is `NaN` when the row is missing, and `NaN` is "not 0", so it passes; the first test's payment already makes the balance non-zero | Assert the row exists and the exact balance |
| `assign-reservation-numbers-automatically` — continues from the highest number | Reads the maximum *after* creating, so `max >= after` is always true | Read the maximum first; assert `after = max + 1` (or `> max`) |
| `keep-guest-notes-private` — notes stay available | Checks only that the guest is found by name; never reads the note | Assert `guests.guestnotes` equals the note |
| `keep-guest-notes-private` — never printed | `not.toContain(secret)` also passes if the reservation is missing from the output; `report_kitchen_meal` has no row for this fixture at all | Also assert the fixture's own row is present |
| `import-the-legacy-access-database-losslessly` | Greps the Python exporter's source; `if (!existsSync(generated)) return` passes silently on any machine without the generated file | Assert against the database (no orphans, sequences ahead of their columns); replace the silent return with an explicit skip |
| `ensure-reservation-notes-feed-reports` — guest-only notes | The criterion has no assertion | Set a guest note; assert it is absent while the fixture's row is present |
| `restrict-the-system-to-signed-in-staff` | `expect(error).not.toBeNull()` accepts any error, typo'd table or network failure included | Assert a permission-denied error (`42501`); also try an anonymous RPC |
| `surface-daily-cash-balance-checks-on-screen` | `/Balanced/` also matches "Unbalanced" | Match the whole word |
| `handle-deposits-on-cancellation` — daily cash balanced | "Upper total = receipts total" also holds with no refund line or both null | Assert the upper total is exactly 0 |
| `preserve-manual-adjustment-visibility`, `print-the-date-search-list`, `include-second-reservation-name-in-guest-search`, `keep-one-primary-guest-per-reservation` | Assertions inside a loop over a list that could be empty | Assert the list's length first |
| `show-tax-lines`, `review-upper-balancing-structure` | Run on isolated dates where every tax is 0, so a broken tax total passes | Post a taxed charge on the date; assert the GST line equals its tax |
| `display-in-house-stay-context-when-active` | Accepts any of several statuses when the right one is known | Assert the exact status |
| `print-check-out-bills-queue` | `> 0` where the exact count is known on an isolated date | Assert the exact value |

## B. Obvious fixes — flaky rather than vacuous

| Test | Problem | Fix |
|---|---|---|
| `find-charge-items-by-code` | `waitForTimeout(150)` then reads the list | Wait on the list's contents |
| `create-reservation`, `convert-us-funds-to-canadian-automatically`, `match-a-phone-number-in-any-format` | Read the screen immediately after a click or focus | `expect.poll` on the value |

## C. Obvious removals or merges — duplicate checks

| Tests | Duplication |
|---|---|
| `open-daily-cash-reporting` and `provide-appendix-drillback` | The same appendix-tab loop |
| `classify-deposit-and-prepayment-activity-for-daily-cash-reportin` and `show-balance-sheet-adjustments` | The same deposit-category check |
| `print-check-in-folios-for-a-selected-day`, `print-check-out-bills-queue`, `print-cancellation-notices` vs `generate-guest-document-queues-through-shared-queue-service-by-o` | The per-document queue checks repeat the shared-queue test |
| within `convert-us-funds-to-canadian-automatically` and within `generate-guest-document-queues-…` | A test repeated inside the same file |

## D. Needs a decision

| Test | Question |
|---|---|
| `view-guest-details-for-a-selected-name-match` | None of its criteria (guest number, address, phones, email) is asserted, and the fixture has none of them. Fix it, or fold it into `correct-a-guests-details`, which now covers the fields? |
| `show-guest-first-name`, `show-guest-name` | The stories are about date-search rows and the filtered kitchen report; the tests use name search. Rewrite to the stories, or rewrite the stories? |
| `calculate-taxes-from-dated-rate-tables`, `convert-us-funds-to-canadian-automatically`, `show-receipts-converted-to-canadian-dollars` | The expected value comes from the same rate function the trigger uses. It passes vacuously when the rate is 0 (seed rates end 2029-12-31) or the exchange rate falls back to 1. Guard with `rate > 0` / `rate ≠ 1`, or check against the rate table directly? |
| `search-by-arrival-date` — open a listed reservation | Looks up the reservation number it already has. Drive the results screen instead? |
| `find-charge-items-by-code` — code order | Sorts with the production `sortItemsByCode` and checks that. Compare the on-screen order to a hand-written expectation? |
| `capture-housekeeping-and-diet-notes-when-booking` — blank notes | Books through the RPC, not the booking screen |
| Label-only screen tests: `render-and-print-cancellation-notice`, `render-and-print-reservation-confirmation`, `print-filtered-kitchen-report-for-selected-date`, `print-in-house-occupancy-report` | Check that headings print, never a value or date. Worth asserting values? |
| `supabase/tests/business_logic_smoke.sql` | Not run by `npm test`. Some checks can't fail: `exception when others` swallows any error; a balance check pays the difference then compares; `count(*) >= 1` against real data; an `if … assert` that can skip. Wire it into the suite and tighten, or leave it as a manual deploy check? |

## E. Criteria with no assertion

Stories whose listed criteria aren't asserted anywhere: `assign-ledger-responsibility` (assigning on screen) · `batch-print-the-daily-print-run` (a failed document is skipped) · `calculate-taxes-from-dated-rate-tables` (recompute on edit; PST/LT/DMT) · `classify-deposit-and-prepayment-…` (applied, refunded, kept) · `convert-us-funds-to-canadian-automatically` (recompute on date change) · `display-arrival-date-and-room-context-for-future-history-rows` (several upcoming stays) · `display-in-house-stay-context-when-active` (visual distinction, room) · `display-guest-notes` (hidden from non-office users) · `generate-guest-document-queues-…` (only the selected date) · `keep-guest-notes-private` (visible on the transaction screen) · `list-room-moves-on-the-check-in-folio-and-confirmation` (dates and party size printed) · `open-reservation` (from date results) · `print-cancellation-notices`, `print-confirmation-slips-…` (only that day) · `print-check-in-folios-for-a-selected-day` (tomorrow) · `print-check-out-bills-queue` (the screen) · `re-book-a-stay-for-next-year` (bed type and group carried) · `remove-a-charge-entered-in-error` (the confirm dialog; removal from daily cash) · `render-and-print-reservation-confirmation` ("clearly confirmed") · `reprint-guest-document-by-guest` · `show-balance-sheet-adjustments` (applied, kept) · `show-guest-address`, `show-guest-city-province-and-country`, `show-guest-email-information`, `show-guest-number` (across history sections) · `show-primary-phone-where-present`, `show-secondary-phone-where-present` (display) · `show-kitchen-notes-in-filtered-kitchen-mode` (printed output) · `show-receipts-converted-to-canadian-dollars` (original US amount) · `show-room` (the "no room" indication) · `show-room-availability-during-booking` (each room's layout) · `show-tax-lines` (amounts, rate type) · `view-selected-stay-context` (occupancy, charge and payment lines).
