# Changeset — only the Access tables the system uses (round 19)

**Date:** 2026-10-29
**Trigger:** Alvin, on what `seed.sql` holds: *"we don't need any of the access user name or
info in the seed.sql do we? just make sure it's all only core system info that comes in, and
seed.sql also only needs to create the tables that are actually in use (similarly, the import
script can filter out the tables that are not utilized by any of the system, so postgres stays
cleaner)"*, and *"the full 'setup' info is good to include in the seed.sql in a case where the
system needs to be started without an access db to go from, but spurious info can be excluded
on both fronts."*
**State:** `npm run check` and `npm run build` clean; every feature test and
`business_logic_smoke.sql` passing. Every migration, the new seed, `seed_admin.sql` and the
smoke test run on an empty PostgreSQL 17, and so do the regenerated full import and the smoke
test after it. `0034` applied to the local stack, then to the hosted project just before the
push (30 October, in `begin … commit`, after `0033`): it has only the tables the system uses,
its guests and bookings untouched.

---

## 1. The seed: the setup, and only that

**What was there.** `seed.sql` was Access data without guest records: the tables of the
Access file that hold none, copied by `generate_seed.py` from the same `.accdb` the full import
reads. Besides the setup it carried Access's registration and version tables (Richard Hill's
name, the lodge's address, the developer's contact details, a list of Access's forms and
queries), Access's user list (staff names and initials), lookups no screen offers, and the
helper and scratch tables Access's forms and reports used.

**Shipped.**
- `SEED_ACCESS_TABLES` (`tools/access_table_map.py`) is the setup the system reads: rooms and
  their rates, the price list, tax and exchange rates, and the pick lists the screens and rules
  read (room rate codes, room types, rate and tax types, item types, the Daily Cash lines,
  salutations, phone types, payment types and payment categories). `seed.sql` is regenerated
  from it: those tables come out byte for byte as before, and nothing else is in it.
- It never carried guest, booking, charge or payment records; the story now says so, and its
  test holds the seed to it.

## 2. The import and the schema: the tables the system uses

**What was there.** `0002` gave every table in the Access file a table here, and the full
import loaded every one of them, including the many nothing reads.

**Shipped.**
- `TABLES` lists only the Access tables the system uses, each read by a screen, report, view,
  function or rule. `export_access_data.py` loads those, every row as before.
- `LEFT_IN_ACCESS` lists the rest, by kind: Access's own settings and compact-error log, its
  user list, lookups no screen offers, its BACKUP copies of the live tables, the helper and
  scratch tables its forms and reports used, tables from old rate and price loads, and the
  shuttle log (empty).
- `export_access_data.py` stops on an Access table in neither list (`undecided_tables`), so a
  table that turns up in the lodge's go-live file is decided on rather than skipped.
- `0034_unused_access_tables.sql` drops the tables of `LEFT_IN_ACCESS`, together and without
  cascade: no view or function refers to them, and only they refer to one another.
- Checked: the regenerated import loads on an empty PostgreSQL after every migration, and the
  smoke test passes on it.

**Judgement calls.**
- **"Used" means read by something:** a screen, report, view, function or rule. Exchange rates
  stay: the payment rule converts US funds with them, though the desk takes Canadian only. Rate
  types and tax types stay: the admin area checks a rate's type against them.
- **The tables are dropped, not left empty,** so the database holds only what the system reads.
  `0002` is left as it is, since it has run on the hosted project. *To back out:* move the table
  from `LEFT_IN_ACCESS` to `TABLES`, recreate it from its definition in `0002`, and re-run the
  import.
- **Access's BACKUP tables are left in Access.** They are copies of the live tables from an
  earlier day: of their 15,057 bookings, all but six are still in the live table, most of them
  unchanged. Those six, and the older versions of the rest, are only in the Access file.
- **The mailout list and the reservation board,** guest lists Access built for a mailing and
  for its booking board, are left in Access too.
- **Taking the staff names out of `seed.sql` doesn't take them out of the repository's
  history,** which is public. Only rewriting that history would, and it isn't done.

## 3. The story and its test

- `import-the-legacy-access-database-losslessly` is now `import-the-legacy-access-database`,
  with its criteria rewritten: the tables the system uses load with every row, the rest stay in
  Access with no table here, the export stops on a table it has no decision for, the seed sets
  up the system and holds nothing else, and every table loaded or seeded is read by the system.
- Its test checks the schema's tables against `TABLES` through the API, the seed's tables
  against `SEED_ACCESS_TABLES` (no guest records, no user list, no Access settings), every table
  in `TABLES` against the app's code and the migrations' views and functions, and, where the
  generated import is present, that it loads `TABLES` alone.
- `README.md` and `supabase/README.md` describe the seed and the import this way.
