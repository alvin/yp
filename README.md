# Yellow Point Lodge — Front Desk System

Production reservation and daily-cash system for Yellow Point Lodge, replacing
the lodge's MS Access workflow while preserving its printed outputs and
operating habits.

| Folder | What it is |
|---|---|
| `app/` | The front desk web app (SvelteKit + Supabase). See `app/README.md` for setup and run instructions. |
| `supabase/` | The production data layer: migrations (schema, views/RPCs, business-logic triggers), seed, Access migration tooling, and smoke tests. See `supabase/README.md`. |
| `spec/` | The living product spec (personas, 90 features, 22 wireframes), synced with UserForge. |
| `original_spec/` | The client's original requirements, wireframes, and printed report samples — the fidelity reference for every printed output. |
| `features/` | The client's original feature/question files. |
| `legacy-db/` | The Access source database (`.accdb`) and its exported schema. |

## Architecture in one paragraph

All business rules live in the database (`ypl` schema): reservation numbering,
the one-year booking horizon, tax calculation from room/inventory flags and
dated rate tables, US→CDN conversion, deposit refund/transfer handling, and
room-move history. The app is a client-rendered SPA that reads through `ypl`
views/RPCs and writes through workflow RPCs, so data stays consistent even when
rows are edited directly in Supabase. Printed reports clone the client's
original designs exactly.

## Migrating the Access data

```sh
python3 supabase/tools/export_access_data.py   # writes supabase/legacy_import/all_legacy_data.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/legacy_import/all_legacy_data.sql
```

The import is verified lossless end-to-end (see `supabase/README.md`).
