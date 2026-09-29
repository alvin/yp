# Yellow Point Lodge — Supabase Production Data Layer

This folder defines the new Supabase/PostgreSQL data layer for Yellow Point Lodge.

Every database — local and hosted alike — uses **one application schema: `ypl`**. There is no second storage schema and no separate query layer. ("Production" throughout this README means the live data layer, not a separate environment; there is only one hosted project — see [Environments](#environments).) The old Access database is only the source for migration/import shape.

## Naming and architecture

| Area | Decision |
|---|---|
| Production schema | `ypl` |
| Production tables | Snake_case table names such as `ypl.guests`, `ypl.reservations`, `ypl.payments`, and `ypl.transactions` |
| Column names | Preserved from the mdbtools-normalized Access field names so data imports losslessly |
| Views/RPCs | Also in `ypl`; used only as app/report helpers, not as a separate schema or layer |
| Access source files | Kept outside this folder under `legacy-db/` |
| Generated full imports | Written to `supabase/legacy_import/` by the import tool and ignored by git |

Why preserve Access-derived columns? The project needs to load the existing production `.accdb` without lossy transforms. Renaming tables gives Supabase table-editor users readable table names while preserving column compatibility for import scripts and future verification against the source database.

## Folder contents

| Path | Purpose |
|---|---|
| `migrations/0001_extensions.sql` | PostgreSQL extensions and the `ypl` schema |
| `migrations/0002_schema.sql` | The production tables in `ypl`, renamed from Access source tables to intuitive snake_case names |
| `migrations/0003_views_and_reports.sql` | `ypl` views/RPCs for search, screens, ledgers, report queues, printed outputs, and DCAR appendices |
| `migrations/0004_security.sql` | Supabase grants and RLS for the `ypl` production schema |
| `migrations/0005_business_logic.sql` | Business logic in the database: consistency triggers plus every workflow write RPC |
| `migrations/0006_ux_refinements.sql` | Search/report refinements from the wireframe audit: richer date search, cancelled-rows option on Manual Sales, multi-name guest documents, shared-booking context in guest history |
| `migrations/0007_note_text.sql` | Converts Access rich-text notes to plain text and keeps them that way |
| `migrations/0008_input_refinements.sql` | Front-desk input refinements from live use: forgiving search terms, multi-keyword and second-name search, stay dates that carry their rooms, loud removal of lines entered in error |
| `migrations/0009_rebooking.sql` | Re-booking is next season's stay rather than a change to this one: `rebook_reservation` dropped, booking horizon narrowed to the arrival date with a week of grace |
| `migrations/0010_output_refinements.sql` | Printed-output and lookup refinements from live use: every receipt and the diet on the check-in folio, the rooms of a stay on the folio and confirmation, room-named charges on the check-out bill, the In House report ordered for section headings, rooms two reservations hold at once, phone numbers matched however punctuated, guest number searchable, company no longer searched |
| `migrations/0011_guest_document_notes.sql` | The diet and the housekeeping note print on both the confirmation and the check-in folio, read the way the kitchen and housekeeping reports read them |
| `migrations/0012_undo_room_move.sql` | A room move can be undone: the stay keeps the room it was leaving |
| `migrations/0013_accurate_occupancy_status.sql` | A room's status for a day is worked out, never assumed: Future, Past and Move Out join Arrive Today, Move In, In House and Depart Today |
| `migrations/0014_one_rule_each.sql` | Each reporting rule written once: rooms held on a day, guests in house, deposit held, the current housekeeping note and the diets that count, daily cash lines that add up to their totals, a charge's daily cash category; removal of an already-removed line fails |
| `migrations/0015_room_rate_type.sql` | A room night is priced at the rate type chosen — Regular, Special or Split — as Access asked |
| `migrations/0016_guest_details_and_notes.sql` | A guest's details can be corrected and cleared; the housekeeping note in force can be cleared; a stay's room can be changed outright without leaving its room charges behind |
| `seed.sql` | Repeatable reference/configuration seed generated from Access lookup/config tables |
| `tests/business_logic_smoke.sql` | Transactional smoke test of the full business-logic layer (rolls back; safe anywhere) |
| `tools/access_table_map.py` | Source Access table to production table mapping |
| `tools/generate_seed.py` | Regenerates `seed.sql` from reference/configuration tables |
| `tools/export_access_data.py` | Exports all Access tables into a full production import SQL script targeting `ypl.*` |

This README is the central Supabase documentation. Import-output directories do not carry separate documentation.

## Migration order

Apply every file in `migrations/` in filename order (`migrations/*.sql` expands in that order).
Then load `seed.sql` for repeatable reference/configuration data.

## Business logic lives in the database

`0005_business_logic.sql` enforces every rule the old Access forms handled, so
the data stays consistent no matter how rows are written — app RPC, Supabase
table editor, SQL editor, or import:

| Table | Trigger behaviour |
|---|---|
| `reservations` | Assigns `resnumber`, defaults booking date, recomputes `numnights`, enforces departure > arrival and the booking horizon when the dates change, stamps confirmation/cancellation dates as those flags are set; date changes cascade to reservation-guest check-in/out and to the room assignments that ran to the reservation's own dates (mid-stay move windows keep theirs) |
| `reservation_guests` | Check-in/out default from the reservation; exactly one primary guest per reservation |
| `room_assignments` | Date validation; guest count defaults from the reservation; a room can't be changed while a room charge for the old room is posted over its nights, nor to the room the stay is in on the nights either side |
| `transactions` | Auto-completes the amount from the price list (manual overrides always win) and recomputes every tax column from room/inventory tax flags × the rate effective on the transaction date |
| `payments` | Payment code derives from the category, payment date defaults, `paymentamountcdn` converts US funds at the effective exchange rate |

Legacy-import safety: triggers only fill missing values and only recompute
derived values when their inputs change, so the air-gapped Access import loads
losslessly.

### Workflow RPCs (writes)

Guests: `create_guest`, `update_guest` (a field given as text sets it, an
empty string clears it, a field left null is kept), `set_guest_notes`
(office-only notes).
Reservations: `create_reservation` (header + primary guest + optional room in
one call), `update_reservation`, `confirm_reservation`, `set_reservation_notes`,
`cancel_reservation(p_deposit_handling => none|refund|keep)`. Re-booking is
not an RPC: next season's stay is written by `create_reservation` like any
other, and the screen carries the party, room and dates forward.
Guests on a stay: `add_reservation_guest`, `update_reservation_guest`.
Rooms: `assign_room`, `record_room_move` (splits the occupancy at the move
date, preserving both rooms in history), `undo_room_move` (the room being left
runs on to the end of the move and the move is archived; a stay that moved out
and back is left in one room; where two rooms moved on the same day the caller
names the one to go back to), `update_room_assignment` (how a stay's room is
changed outright, as Access did it), `room_directory(p_in,
p_out)` for room selection — the booking screen marks a room another stay holds
for any of the nights as Booked.
Charges: `post_room_nights` (priced at the rate type chosen, Regular unless
Special or Split is given), `post_charge` (posts to the item's daily cash
category, `charge_category`, unless told otherwise), `archive_transaction`,
`sell_gift_certificate` (charge line + matching receipt).
Payments: `record_payment` (all categories; refund categories store negative),
`archive_payment`.
`archive_transaction`/`archive_payment` are how a line entered in error is
removed: the row is archived, not deleted, so it leaves the ledger, the balance
and every report while the correction stays auditable. Both raise when the line
does not exist or is already removed, rather than silently doing nothing; so do
`archive_housekeeping_note` and `archive_kitchen_meal`.
Notes: `set_housekeeping_note` (the note in force: new text is added to the
dated history, the same text changes nothing, an empty note clears it),
`add_housekeeping_note`, `archive_housekeeping_note`, `save_kitchen_meal` (a
blank diet and notes clear the diet), `archive_kitchen_meal`.

### Read helpers worth knowing

`rooms_held(p_from, p_to, p_include_cancelled)` (0014) — the one definition of
which room windows are touched on a day or across a range: arriving, staying,
moving or leaving, with removed rooms, removed guest names and archived stays
never counted. The housekeeping, In House and manual sales reports, the guest
total and both date searches read it. Room availability and room sharing ask a
different question — who holds a room *overnight* — and keep their own night
rule, so a room left on the 5th is free for an arrival on the 5th.

`guests_in_house(p_date)` (0014) — Total Guests on the In House and
Kitchen/Meal reports, a party moving rooms counted once.

`reservation_deposit_held(p_reservationid)` (0014) — the deposit still held on
a stay: received, less refunded, applied or kept. `v_reservation_summary`
carries it as `deposit_held`; the date search and the cancel dialog show it.

`report_stay_rooms(p_reservationid)` — every room a stay occupies with its own
dates and party size, in stay order. The check-in folio and the confirmation
print it, so a party moving mid-stay reads the whole stay off the slip; a stay
that never moves returns the single row those documents always showed.

`report_folio_receipts(p_reservationid)` — deposits, prepayments and gift
certificates received against a stay, oldest first. The check-in folio prints
all of them, not the deposit alone.

`stay_diet_notes(p_reservationid)` / `stay_housekeeping_notes(p_reservationid)`
— the diet and housekeeping note a stay carries, read from `v_kitchen_diets`
(diet records that are neither removed nor blank) and
`v_current_housekeeping_notes` (the latest note per guest) — the same views the
kitchen and housekeeping reports read. The confirmation and the check-in folio
print them.

`room_moves(p_reservationid)` (0012) — the room windows of a stay that are
moves, each with the window it moved from. `record_room_move` doesn't link the
two, so a move is read the way the stay history reads: same guest, another
room, opening the day the other closes. Two rows for one window means two rooms
moved that day.

`shared_room_occupancies(p_reservationid)` — room windows on this stay that
another live reservation also holds for at least one night, with the party
sharing it. The lodge shares rooms on purpose as well as by accident, so this
reports the fact and nothing prevents it. Two stays that only meet at a
turnover — one leaving the day the next arrives — are not sharing; the overlap
has to be a night both parties hold. `search_by_date` carries the same fact as
a `shared_room` flag.

`search_terms(p_query)` / `digits_only(text)` / `digits_pattern(text)` —
keyword normalization behind `search_all_fields`. A telephone number matches
however either side is punctuated; an entry that is nothing but a number is one
search term, not one per space. `search_terms` is plpgsql with an explicit
`rows 3` for a reason: an inlinable SQL function hands its body to the planner,
`regexp_split_to_table`'s default guess of a thousand rows follows, and the
resulting plan takes half a minute on a one-letter search.

### Smoke test

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/business_logic_smoke.sql
```

Runs the entire workflow (guest → reservation → charges → payments → move →
cancel → reports) inside one transaction and rolls back.

## Core production tables

Every Access source table is represented in `ypl` with a readable name.

| Workflow area | Production tables |
|---|---|
| Guests and reservations | `ypl.guests`, `ypl.reservations`, `ypl.reservation_guests` |
| Rooms and room moves | `ypl.rooms`, `ypl.room_assignments`, `ypl.room_assignments_backup` |
| Charges and payments | `ypl.transactions`, `ypl.payments`, plus backup tables |
| Operations notes | `ypl.housekeeping_notes`, `ypl.kitchen_meals` |
| Lookup/config | `ypl.lookup_*`, `ypl.room_rates`, `ypl.tax_rates`, `ypl.exchange_rates`, `ypl.inventory_items` |

Important model facts:

- `ypl.reservations` is the reservation header.
- `ypl.reservation_guests` links guests to reservations and carries vehicle, check-in/out, in-house, percent-of-bill, and in-house-report notes.
- `ypl.room_assignments` is the room assignment / room move spine and links to `ypl.reservation_guests`.
- `ypl.transactions` stores charge lines, amounts, taxes, inventory/room references, and occupancy date context.
- `ypl.payments` stores deposits, prepayments, payments, refunds, A/R movements, gift certificates, gratuities, cash categories, and old card fields retained for the air-gapped local import.
- `ypl.kitchen_meals` is guest-linked; kitchen reports join it through active reservation guests.
- `ypl.housekeeping_notes` is reservation-guest-linked and feeds housekeeping reports.

## Views and RPCs

Views/RPCs are not a separate schema. They live in `ypl` next to the tables and exist to keep application/report queries readable and repeatable.

Use tables directly for table-editor/admin work. Use views/RPCs when the application or report needs joined, calculated, or filtered data.

### Search and navigation

- `ypl.search_guests_by_name(p_query, p_limit)` — partial-string match on
  last, first and display name. Every keyword must match, so extra characters
  narrow rather than widen; `other_names` carries the other names the guest's
  stays are booked under.
- `ypl.search_all_fields(p_query)` — broad match over guest name, guest number,
  phones, address and email plus reservation number and group. Several keywords
  may be entered; a record is returned once, only when it carries them all, with
  `matched_on`/`detail` naming the fields that matched. Phone numbers match
  however either side is punctuated.
- `ypl.search_pattern(p_term)` / `ypl.search_patterns(p_query)` — how a typed
  entry becomes LIKE patterns: keywords split on whitespace, placeholder
  punctuation at either end dropped (`-illington` finds `Shillington`), `*`
  honoured as a wildcard, literal LIKE metacharacters escaped.
- `ypl.guest_co_names(p_guestid)`
- `ypl.find_reservation(p_resnumber)`
- `ypl.search_by_date(p_date, p_mode)` where `p_mode` is `arrivals`, `departures`, `both`, `in_house`, or `occupancy`
- `ypl.search_by_date_range(p_from, p_to, p_mode)`
- `ypl.guest_history(p_guestid, p_ref_date)`

### Screen/ledger helpers

- `ypl.v_guest_summary`
- `ypl.v_reservation_summary`
- `ypl.v_reservation_guest_summary`
- `ypl.v_occupancy_summary`
- `ypl.v_transaction_lines`
- `ypl.v_payment_lines` — intentionally excludes `ccnumber` and `ccexpdate`
- `ypl.reservation_ledger(p_reservationid)`
- `ypl.reservation_balance(p_reservationid)`

### Reports and DCAR

- Guest documents: `ypl.report_reservation_confirmation`, `ypl.report_check_in_folio`, `ypl.report_checkout_bill_header`, `ypl.report_checkout_bill_lines`, `ypl.report_cancellation_notice`, `ypl.report_guest_document_queue`
- Operations reports: `ypl.report_housekeeping`, `ypl.report_in_house`, `ypl.report_kitchen_meal`, `ypl.report_kitchen_meal_filtered`, `ypl.report_manual_sales`, `ypl.report_cancellation_list`
- DCAR/appendices: `ypl.report_dcar_upper`, `ypl.report_dcar_total`, `ypl.report_dcar_payments`, `ypl.report_dcar_receipts_total`, `ypl.report_dcar_summary`, `ypl.report_deposits_received`, `ypl.report_deposits_applied`, `ypl.report_cashier_detail`, `ypl.report_items_cashed_out`

## Seed policy

Regenerate repeatable seed data with:

```sh
python3 supabase/tools/generate_seed.py
```

`seed.sql` includes reference/configuration data only:

- application/config metadata
- lookup values
- rooms
- inventory
- tax/exchange/room-rate tables
- Access query-helper tables that are safe as repeatable reference data

`seed.sql` deliberately excludes operational production rows such as guests, reservations, payments, transactions, housekeeping/kitchen notes, mailouts, and backups because those include PII and old payment-card fields.

## Full production data import

For the air-gapped local migration environment, generate a full import script with:

```sh
python3 supabase/tools/export_access_data.py
```

By default, this writes:

```text
supabase/legacy_import/all_legacy_data.sql
```

Generated `*.sql` files under `supabase/legacy_import/` are ignored by git because they include all Access production data, including PII and old card fields.

The full import script:

- exports every Access source table,
- rewrites Access `tbl...` table targets to production `ypl.*` table names,
- preserves all old operational data and sensitive fields for the air-gapped deployment,
- loads with `session_replication_role = replica` so the business-logic
  triggers do not recompute or validate historical rows (byte-for-byte import;
  requires superuser, which the controlled migration environment provides),
- nulls Access "zero dates" (day 00, e.g. `1900-01-00`) that PostgreSQL rejects,
- converts the rich-text memo fields to plain text (`ypl.normalize_stored_notes()`),
- resets serial sequences and the in-house reservation-number sequence after import.

The path is verified end-to-end against the real `.accdb`: all tables load with
zero referential orphans, no duplicate reservation numbers, `numnights`
consistent with stay dates, and report and search RPCs run in tens of milliseconds on the full dataset,
except `search_all_fields`, which takes a few hundred. Note that
`mdb-count` under-reports row counts on some tables; `mdb-export` (which the
import uses) is authoritative.

Do not commit generated full-import SQL.

## Environments

There are two, and only two:

| | What it is |
|---|---|
| **Local** | `supabase start` from the repo root. Migrations plus `seed.sql`; the test suite runs against it. |
| **YP Test** — `evapfimnlxwckgbllzys`, ca-central-1 | The one hosted Supabase project. The deployed app and the client's review both point at it, and it carries the full Access import including guest PII. |

**There is no separate production project.** A migration is live once it has been
applied to `evapfimnlxwckgbllzys`; there is nowhere else to promote it to. The
project is named "YP Test" for historical reasons — treat it as the real thing,
because the lodge does.

To check what a migration's objects look like there without a database password,
send a read query through the same Management API that `run_remote_sql.py` uses.

## Deploying to the hosted project

`tools/run_remote_sql.py` applies SQL files through the Management API, so no
direct database password is needed for schema work:

```sh
export SUPABASE_ACCESS_TOKEN=…   # app/.env carries one
python3 tools/run_remote_sql.py evapfimnlxwckgbllzys migrations/*.sql seed.sql
```

A single new migration is applied the same way, naming only that file. Wrap it
in `begin … commit` when it drops and recreates functions the app is using, so a
failure part-way leaves the old definitions in place.

Two things the Management API cannot do, because they need a *direct* session:

- **The full legacy import.** It is one transaction using
  `set session_replication_role = replica`, which must hold for the whole
  session. Use `psql` against the **session-mode** pooler (port 5432 — the
  transaction-mode pooler on 6543 will not hold session state):

  ```sh
  PGPASSWORD=… psql "postgresql://postgres.<ref>@<region>.pooler.supabase.com:5432/postgres?sslmode=require" \
    -v ON_ERROR_STOP=1 -f legacy_import/all_legacy_data.sql
  ```

  Note that `session_replication_role = replica` *is* available to the
  `postgres` role on hosted Supabase, so the byte-for-byte import path works
  there and not only in the air-gapped environment.

- **Exposing `ypl` on the API.** Project Settings → API → Exposed schemas is
  the durable place to set this. If your access token lacks org privileges for
  that endpoint, the same thing can be set at the database level:

  ```sql
  alter role authenticator set pgrst.db_schemas = 'public, graphql_public, ypl';
  notify pgrst, 'reload schema';
  ```

### Keeping the hosted project shut

`0004_security.sql` grants the `authenticated` role access to `ypl`. Supabase
projects permit self-service signup by default, and the hosted project carries
the full import including guest PII, so **anyone who can sign up gains
staff-level read access**. Turn signup off in the dashboard, and apply
`staging/staging_hardening.sql`, which enforces an email allowlist with a
trigger on `auth.users` as a second line of defence.

## Security and Supabase API exposure

`0004_security.sql` grants authenticated staff and service role access to `ypl`, enables RLS on production tables, and creates staff policies. Anonymous/public access receives no grants.

In Supabase Project Settings → API → Exposed schemas, expose `ypl` if the app or power users need API/table-editor access to the production schema.

## Open schema decision

The current Access data appears to store calculated DCAR inputs but not durable rows for handwritten actual amounts, staff-tip codes, or manual adjustments. Do not add a new app-owned adjustment table until that product decision is approved in the feature scope.
