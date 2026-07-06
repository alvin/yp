# Yellow Point Lodge — Supabase Production Data Layer

This folder defines the new Supabase/PostgreSQL data layer for Yellow Point Lodge.

The production database uses **one application schema: `ypl`**. There is no second storage schema and no separate query layer. The old Access database is only the source for migration/import shape.

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
| `migrations/0002_schema.sql` | 60 production tables in `ypl`, renamed from Access source tables to intuitive snake_case names |
| `migrations/0003_views_and_reports.sql` | `ypl` views/RPCs for search, screens, ledgers, report queues, printed outputs, and DCAR appendices |
| `migrations/0004_security.sql` | Supabase grants and RLS for the `ypl` production schema |
| `migrations/0005_business_logic.sql` | Business logic in the database: consistency triggers plus every workflow write RPC |
| `migrations/0006_ux_refinements.sql` | Search/report refinements from the wireframe audit: richer date search, cancelled-rows option on Manual Sales, multi-name guest documents, shared-booking context in guest history |
| `seed.sql` | Repeatable reference/configuration seed generated from Access lookup/config tables |
| `tests/business_logic_smoke.sql` | Transactional smoke test of the full business-logic layer (rolls back; safe anywhere) |
| `tools/access_table_map.py` | Source Access table to production table mapping |
| `tools/generate_seed.py` | Regenerates `seed.sql` from reference/configuration tables |
| `tools/export_access_data.py` | Exports all Access tables into a full production import SQL script targeting `ypl.*` |

This README is the central Supabase documentation. Import-output directories do not carry separate documentation.

## Migration order

Apply migrations in filename order:

1. `0001_extensions.sql`
2. `0002_schema.sql`
3. `0003_views_and_reports.sql`
4. `0004_security.sql`
5. `0005_business_logic.sql`
6. `0006_ux_refinements.sql`

Then load `seed.sql` for repeatable reference/configuration data.

## Business logic lives in the database

`0005_business_logic.sql` enforces every rule the old Access forms handled, so
the data stays consistent no matter how rows are written — app RPC, Supabase
table editor, SQL editor, or import:

| Table | Trigger behaviour |
|---|---|
| `reservations` | Assigns `resnumber`, defaults booking date, recomputes `numnights`, enforces departure > arrival and the one-year booking horizon, keeps confirmation/cancellation dates consistent; date changes cascade to reservation-guest check-in/out |
| `reservation_guests` | Check-in/out default from the reservation; exactly one primary guest per reservation |
| `room_assignments` | Date validation; guest count defaults from the reservation |
| `transactions` | Auto-completes the amount from the price list (manual overrides always win) and recomputes all seven tax columns from room/inventory tax flags × the rate effective on the transaction date |
| `payments` | Payment code derives from the category, payment date defaults, `paymentamountcdn` converts US funds at the effective exchange rate |

Legacy-import safety: triggers only fill missing values and only recompute
derived values when their inputs change, so the air-gapped Access import loads
losslessly.

### Workflow RPCs (writes)

Guests: `create_guest`, `update_guest`, `set_guest_notes` (office-only notes).
Reservations: `create_reservation` (header + primary guest + optional room in
one call), `update_reservation`, `confirm_reservation`, `set_reservation_notes`,
`cancel_reservation(p_deposit_handling => none|refund|keep)`,
`rebook_reservation` (new stay, deposits transferred with an offsetting
refund/received pair, original cancelled).
Guests on a stay: `add_reservation_guest`, `update_reservation_guest`,
`set_guest_in_house`, `archive_reservation_guest`.
Rooms: `assign_room`, `record_room_move` (splits the occupancy at the move
date, preserving both rooms in history), `update_room_assignment`,
`archive_room_assignment`, `room_directory(p_in, p_out)` for room-selection
help with availability.
Charges: `post_room_nights`, `post_charge`, `archive_transaction`,
`sell_gift_certificate` (charge line + matching receipt).
Payments: `record_payment` (all categories; refund categories store negative),
`archive_payment`.
Notes: `add_housekeeping_note`, `archive_housekeeping_note`,
`save_kitchen_meal`, `archive_kitchen_meal`.

### Smoke test

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/business_logic_smoke.sql
```

Runs the entire workflow (guest → reservation → charges → payments → move →
cancel → rebook → reports) inside one transaction and rolls back.

## Core production tables

The Access source contains 60 tables. All 60 are represented in `ypl` with readable names.

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

- `ypl.search_guests_by_name(p_query)`
- `ypl.search_all_fields(p_query)`
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

- exports all 60 Access source tables,
- rewrites Access `tbl...` table targets to production `ypl.*` table names,
- preserves all old operational data and sensitive fields for the air-gapped deployment,
- loads with `session_replication_role = replica` so the business-logic
  triggers do not recompute or validate historical rows (byte-for-byte import;
  requires superuser, which the controlled migration environment provides),
- nulls Access "zero dates" (day 00, e.g. `1900-01-00`) that PostgreSQL rejects,
- resets serial sequences and the in-house reservation-number sequence after import.

The path is verified end-to-end against the real `.accdb`: all tables load with
zero referential orphans, no duplicate reservation numbers, `numnights`
consistent with stay dates, and every report/search RPC runs in tens of
milliseconds on the full dataset (~31k reservations, ~76k payments). Note that
`mdb-count` under-reports row counts on some tables; `mdb-export` (which the
import uses) is authoritative.

Do not commit generated full-import SQL.

## Security and Supabase API exposure

`0004_security.sql` grants authenticated staff and service role access to `ypl`, enables RLS on production tables, and creates staff policies. Anonymous/public access receives no grants.

In Supabase Project Settings → API → Exposed schemas, expose `ypl` if the app or power users need API/table-editor access to the production schema.

## Open schema decision

The current Access data appears to store calculated DCAR inputs but not durable rows for handwritten actual amounts, staff-tip codes, or manual adjustments. Do not add a new app-owned adjustment table until that product decision is approved in the feature scope.
