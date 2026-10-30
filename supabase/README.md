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
| `migrations/` | The schema, its rules and every view and RPC, as numbered files applied in order. Each opens with a header saying what it changes and why; later files replace earlier definitions rather than editing them |
| `seed.sql` | Repeatable reference/configuration seed generated from Access lookup/config tables |
| `seed_admin.sql` | The admin login, `admin@yellowpointlodge.com` (only its password's bcrypt hash: the repository is public) |
| `tests/business_logic_smoke.sql` | Transactional smoke test of the full business-logic layer (rolls back; safe anywhere) |
| `tools/access_table_map.py` | Source Access table to production table mapping |
| `tools/generate_seed.py` | Regenerates `seed.sql` from reference/configuration tables |
| `tools/export_access_data.py` | Exports all Access tables into a full production import SQL script targeting `ypl.*` |
| `tools/run_remote_sql.py` | Applies SQL files to the hosted project through the Management API |
| `staging/` | SQL kept for the hosted project alone, such as the signup allowlist |
| `config.toml` | The local stack's settings, including the `ypl` schema on the API |

This README is the central Supabase documentation. Import-output directories do not carry separate documentation.

## Migration order

Apply every file in `migrations/` in filename order (`migrations/*.sql` expands in that order).
Then load `seed.sql` for repeatable reference/configuration data, and
`seed_admin.sql` for the admin login. `supabase db reset` loads both
(`config.toml`); `seed_admin.sql` leaves a login that already exists alone, and
does nothing on a PostgreSQL without Supabase's auth schema.

Migrations change structure and rules, never data. All data comes from the
Access import (`seed.sql` and the full import below), which the lodge's current
Access file replaces at go-live; a change to which Access data is kept belongs
in `tools/`, not in a migration.

## Business logic lives in the database

The migrations enforce every rule the old Access forms handled (most of them
in `0005_business_logic.sql`), so the data stays consistent no matter how rows
are written — app RPC, Supabase table editor, SQL editor, or import:

| Table | Trigger behaviour |
|---|---|
| `reservations` | Assigns `resnumber`, defaults booking date, recomputes `numnights`, enforces departure > arrival and the booking horizon when the dates change, stamps confirmation/cancellation dates as those flags are set; date changes cascade to reservation-guest check-in/out and to the room assignments that ran to the reservation's own dates (mid-stay move windows keep theirs); a change to the number of guests goes to every room the whole party is in (rooms held side by side keep theirs), and a reservation holds at least one guest |
| `reservation_guests` | Check-in/out default from the reservation; one live guest per reservation, its primary guest (a unique index) |
| `room_assignments` | Date validation, and a live room holds at least one night; guest count defaults from the reservation, and a count written is at least one; a room can't be changed while a room charge for the old room is posted over its nights, nor to the room the stay is in on the nights either side |
| `transactions` | Auto-completes the amount from the price list (manual overrides always win) and recomputes every tax column from room/inventory tax flags × the rate effective on the transaction date |
| `payments` | Payment code derives from the category, payment date defaults, `paymentamountcdn` converts US funds at the effective exchange rate |
| Every notes column | Stored as plain text: Access's rich-text markup is converted however the note is written |

Legacy-import safety: triggers only fill missing values and only recompute
derived values when their inputs change, so the air-gapped Access import loads
losslessly.

### Workflow RPCs (writes)

Guests: `create_guest`, `update_guest` (a field given as text sets it, an
empty string clears it, a field left null is kept), `set_guest_notes`
(office-only notes).
Reservations: `create_reservation` (header + its guest + optional room in
one call), `update_reservation` (the number of guests among the rest),
`confirm_reservation`, `set_reservation_notes` (office-only notes on the
stay; they print only on the Cancellation List),
`cancel_reservation(p_deposit_handling => none|refund|keep)` (with none the
deposit stays held to decide later; a cancellation note joins the reservation
notes, which the Cancellation List prints), `settle_deposit` (refunds or keeps the
deposit a stay still holds, dated the day it is settled),
`uncancel_reservation` (the booking stands again as it was; a deposit refunded
or kept on cancelling, and the cancellation note, stay as recorded). Re-booking is not an RPC: next season's stay is written by `create_reservation` like any
other, and the screen carries the party, room and dates forward.
The guest on a stay: `update_reservation_guest` (notes, vehicle, times). A
reservation holds one guest; a room two parties share is two reservations.
Rooms: `assign_room`, `record_room_move` (splits the occupancy at the move
date, preserving both rooms in history; a move on the check-out date runs the
stay on to `p_out`, one night by default, in the new room only), `undo_room_move` (the room being left
runs on to the end of the move and the move is archived; a stay that moved out
and back is left in one room; where two rooms moved on the same day the caller
names the one to go back to), `update_room_assignment` (how a stay's room is
changed outright, as Access did it, and how a room held side by side with
another gets its own number of guests), `room_directory(p_in,
p_out)` for room selection, `set_occupancy_notes` (one room's notes: the In House
report and the confirmation print them) — the booking screen marks a room another stay holds
for any of the nights as Booked.
Charges: `post_room_nights` (priced at the rate type chosen, Regular unless
Special or Split is given — the desk reads them as Double, Single and Split),
`post_charge` (posts to the item's daily cash
category, `charge_category`, unless told otherwise), `change_charge_quantity`
(the line keeps the price per unit it was posted at; its taxes follow, and a
room line's nights), `archive_transaction`, `sell_gift_certificate` (charge
line + matching receipt).
Payments: `record_payment` (all categories; refund categories store negative;
a deposit kept counts against the stay like a charge), `archive_payment`. The
desk never records a deposit or prepayment as applied: the cash sheet applies
whatever a stay still holds on its check-out day.
Admin area (0033; the admin login only, `is_admin()`): `save_tax_rate`
(adds a dated tax rate, or changes one's rate, From and To dates and notes; a
new rate that starts while another runs, and runs at least as long, ends that
one the day before), `remove_tax_rate` (a rate starting today or later; the rate
ending the day before it runs on over its days again), `save_item_type` (adds
an item type with the daily cash line its charges post to, or changes a
type's line), `save_inventory_item` (adds an item or changes one, its notes
included, and disables or enables it, sold or not; a code an active item
already has is refused). Notes left out of either call stay as they are. An item's price isn't dated, so it is changed where it stands.
Rooms, as Access's Room form kept them: `save_room` (name, number, type, code,
shorthand, sort order, notes, taxes and archive; two rooms can't share a name
and number, or a sort order, and a decimal sort order places a room between
two others), `save_room_rate` (changes a rate row, or adds one to each room
given, as Access's Append Room Rates did; each room's rate of that type
running when it starts, and ending no later than it does, ends the day
before), `remove_room_rate` (the same rule as a tax rate), `save_rate_code`
(adds a rate code, or changes its description) and `add_room_type`. Each RPC
refuses any other login with "Only the admin login can change the tax rates
and the price list." Two rates of one tax, or of one room and rate type, can
never cover the same day: a trigger on `tax_rates` and on `room_rates`
refuses the row and names the one in the way, however it is written.
`archive_transaction`/`archive_payment` are how a line entered in error is
removed: the row is archived, not deleted, so it leaves the ledger, the balance
and every report while the correction stays auditable. Both raise when the line
does not exist or is already removed, rather than silently doing nothing.
Notes: `set_housekeeping_note` (the note in force: new text is added to the
dated history, the same text changes nothing, an empty note clears it),
`add_housekeeping_note`, `save_kitchen_meal` (a blank diet and notes clear the
diet). The guest's requests are `rgnotes`, written by `update_reservation_guest`; they print on the
confirmation and the requests reports, not the In House report (0030).

### Read helpers worth knowing

`rooms_held(p_from, p_to, p_include_cancelled)` (0014) — the one definition of
which room windows are touched on a day or across a range: arriving, staying,
moving or leaving, with removed rooms, removed guest names and archived stays
never counted. The housekeeping, In House and manual sales reports, the guest
total and both date searches read it (the manual sales list leaves off the
rooms checking out that day, 0031). Room availability and room sharing ask a
different question — who holds a room *overnight* — and keep their own night
rule, so a room left on the 5th is free for an arrival on the 5th.

`guests_in_house(p_date)` (0014) — Total Guests on the Kitchen/Meal report:
everyone at the lodge that day, departing guests included, a party moving rooms
counted once.

`in_house_counts(p_date)` (0032) — the In House report's summary line: the
guests arriving, departing and in house, and Total Guests (arriving plus in
house, as Access counted it). The housekeeping report ends on the same Total
Guests. A party moving rooms is counted once.

`occupancy_status(…)` (0013) names a room's day: Arrive Today, Move In, Move
Out, In House or Depart Today. The housekeeping report prints it as is; the In
House report puts both rooms of a move under In House, as Access's did (0032).

`reservation_deposit_held(p_reservationid)` (0014) — the deposit still held on
a stay: received, less refunded, applied or kept. `v_reservation_summary`
carries it as `deposit_held`; the date search, the cancel dialog and Settle
deposit show it.

`charges_cashed_out(p_date)` (0021) — the charge lines a day's cash sheet
counts: a stay's charges on its check-out day, and a charge posted after its
stay's check-out day (a walk-in sale on a daily sales account, a late charge)
on the day it was posted. The top section's sales and taxes read it, and the
Items Cashed Out appendix reads its lines other than rooms.

`cashed_out_on(transdate, checkoutdate)` (0033) is the rule itself, which
`charges_cashed_out` reads. `report_items_sold(p_from, p_to, p_codes)` is the
Items Cashed Out appendix over a range of days, for the codes given (all when
null), each line with the day it was cashed out and its item type. A summer
runs to thousands of lines, past the API's 1,000-row page, so the app reads it
a page at a time.

`tax_rate_in_force(p_type, p_date)` / `room_rate_in_force(p_roomid, p_date,
p_ratetype)` (0033) — the rate row in force on a date, the one rule behind
`effective_tax_rate` and `effective_room_rate`. `rate_codes()` lists the room
rate codes with how many active rooms have a rate at each today or later, and
`room_types()` the room types with how many active rooms are of each.

`charge_category(p_invtype)` — the daily cash line an item's charges post to:
the line its type carries (`lookup_inventory_types.transactiontype`, 0033), or
for the types from Access the one they always had. `item_types()` lists them.

`report_next_years_deposits(p_from, p_to)` (0033) — deposits received between
two dates for stays arriving after the second, by month: January 1 to
December 31 is the year end.

`applied_at_check_out(p_date)` (0021) — the deposit or prepayment each stay
checking out that day still holds, applied to its bill: received, less refunded
and kept. Stays from Access carry the applied line their clerk wrote (with the
deposit line set to $0.00), and the larger of the two counts, so no stay counts
twice. Cancelled stays are never applied. The sheet's Deposit (Applied) and
Prepayment (Applied) lines and the Deposits Applied appendix read it.

`payment_moves_money(category)` (0021) — false for what settles a bill without
money changing hands that day: deposits and prepayments applied, deposits kept,
gift certificates received, bills sent to accounts. Those come off the top
section's total and stay out of the receipts by type of cash and the Cashier
Detail.

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

`stay_occupancy_notes(p_reservationid)` / `stay_request_notes(p_reservationid)`
(0026) — a stay's occupancy notes, each different note once in room order, and
the guest's requests. The confirmation prints both; the cancellation notice
prints neither (0029). `report_requests(p_date)` lists the requests of
everyone at the lodge on a day (the `rooms_held` set) and
`report_guest_requests(p_guestid)` one guest's, stay by stay; cancelled stays
are left out of both.

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
- `ypl.reservation_guests` links each reservation to its one guest and carries vehicle, check-in/out and the guest's requests (`rgnotes`); Access's percent-of-bill column is kept as imported.
- `ypl.room_assignments` is the room assignment / room move spine and links to `ypl.reservation_guests`; each room carries its own occupancy notes.
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
  narrow rather than widen; partners booked as one double surname are found
  from either half.
- `ypl.search_all_fields(p_query)` — broad match over guest name, guest number,
  phones, address and email plus reservation number and group. Several keywords
  may be entered; a record is returned once, only when it carries them all, with
  `matched_on`/`detail` naming the fields that matched. Phone numbers match
  however either side is punctuated.
- `ypl.search_pattern(p_term)` / `ypl.search_patterns(p_query)` — how a typed
  entry becomes LIKE patterns: keywords split on whitespace, placeholder
  punctuation at either end dropped (`-illington` finds `Shillington`), `*`
  honoured as a wildcard, literal LIKE metacharacters escaped.
- `ypl.find_reservation(p_resnumber)`
- `ypl.search_by_date(p_date, p_mode)` where `p_mode` is `arrivals`, `departures`, `both`, `in_house`, or `occupancy`
- `ypl.search_by_date_range(p_from, p_to, p_mode)`
- `ypl.guest_history(p_guestid, p_ref_date)`

### Screens, ledgers and reports

The screens read the `v_*_summary` views (guest, reservation, reservation guest,
occupancy) and the line views behind each ledger; `v_payment_lines`
intentionally leaves out the old card number and expiry. `reservation_ledger`
and `reservation_balance` give a stay's lines and what it owes.

Each printed report and guest document has its own `report_*` RPC returning
exactly the rows it prints, so a report's content is defined in one place and
its test reads it there. The Daily Cash Activity Report is built from
`report_dcar_upper` (its sales section) and `report_dcar_payments` (receipts by
type of cash), with its appendices each reading the same rules.

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
- leaves off lookup values the lodge has retired (`RETIRED_LOOKUP_VALUES` in
  `tools/access_table_map.py`; `generate_seed.py` does the same),
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
applied to `evapfimnlxwckgbllzys`; there is nowhere else to promote it to. It is a
test system for the lodge's review: production is set up at go-live, with a
deploy path of its own.

To check what a migration's objects look like there without a database password,
send a read query through the same Management API that `run_remote_sql.py` uses.

## Deploying to the hosted project

`tools/run_remote_sql.py` applies SQL files through the Management API, so no
direct database password is needed for schema work:

```sh
export SUPABASE_ACCESS_TOKEN=…   # app/.env carries one
python3 supabase/tools/run_remote_sql.py evapfimnlxwckgbllzys supabase/migrations/*.sql supabase/seed.sql
```

A single new migration is applied the same way, naming only that file. Wrap it
in `begin … commit` when it drops and recreates functions the app is using, so a
failure part-way leaves the old definitions in place.

The admin login goes onto the hosted project the same way, once its signup
allowlist names it (`staging/staging_hardening.sql` does):

```sh
python3 supabase/tools/run_remote_sql.py evapfimnlxwckgbllzys \
  supabase/staging/staging_hardening.sql supabase/seed_admin.sql
```

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

`0033_admin_area.sql` narrows the policies on the tax rates, the price list
and the rooms: every signed-in login reads `tax_rates`, `inventory_items`,
`lookup_inventory_types`, `rooms`, `room_rates`, `lookup_room_rate_codes` and
`lookup_room_types`, but only the admin login (`is_admin()`) writes them. The
service role and the SQL editor are unaffected.

In Supabase Project Settings → API → Exposed schemas, expose `ypl` if the app or power users need API/table-editor access to the production schema.

## Open schema decision

The current Access data appears to store calculated DCAR inputs but not durable rows for handwritten actual amounts, staff-tip codes, or manual adjustments. Do not add a new app-owned adjustment table until that product decision is approved in the feature scope.
