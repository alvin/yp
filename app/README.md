# Yellow Point Lodge — Front Desk

Production front desk system for Yellow Point Lodge, built with SvelteKit
(Svelte 5) and Supabase. All business rules — reservation numbering, the
one-year booking horizon, tax calculation, US→CDN conversion, deposit
refund/transfer handling — live in the `ypl` database schema (triggers +
RPCs), so the data stays consistent even when rows are edited directly in
Supabase.

## Setup

1. Start (or connect to) the Supabase project. Locally:

   ```sh
   # from the repo root
   supabase start        # applies supabase/migrations + seed.sql
   ```

2. Expose the `ypl` schema (already configured in `supabase/config.toml` for
   local; for a hosted project set Project Settings → API → Exposed schemas).

3. Create a staff login (email + password) — locally:

   ```sh
   curl -s -X POST 'http://127.0.0.1:54321/auth/v1/admin/users' \
     -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
     -H 'Content-Type: application/json' \
     -d '{"email":"frontdesk@yellowpointlodge.com","password":"…","email_confirm":true}'
   ```

4. Configure the app environment (`app/.env`, see `.env.example`):

   ```
   PUBLIC_SUPABASE_URL=…
   PUBLIC_SUPABASE_ANON_KEY=…
   ```

## Run

```sh
npm install
npm run dev      # development
npm run check    # type-check
npm run build    # static SPA build (deploy the build/ folder to any host)
```

## How it's wired

- `src/lib/data/client.ts` — Supabase client bound to the `ypl` schema.
- `src/lib/data/queries.ts` — one exported function per `ypl` view/RPC (reads).
- `src/lib/data/mutations.ts` — one exported function per workflow write RPC.
- `src/lib/data/reference.ts` — rooms, inventory, lookups, and current
  tax/exchange rates, loaded from the database once per session.
- `src/lib/report.css` + `src/routes/reports/**` — printed outputs cloned
  from the client's original designs in `original_spec/reports/`; the markup
  and CSS classes match the originals so printed pages are identical.

Screens are intentionally minimal: Lookup (home), Name/Date/All-fields search
results, Guest history, the Reservation transaction screen, the Print Center,
and the Daily Cash Activity Report with its appendices.

## Verification

- `supabase/tests/business_logic_smoke.sql` — full workflow smoke test of the
  database layer (transactional; rolls back).
- API-level and browser-level end-to-end checks were run against the local
  stack: sign-in gate, reservation creation, charges/payments, room moves,
  cancellation with deposit refund, and every printed report.
