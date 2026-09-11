# Yellow Point Lodge — Front Desk

Production front desk system for Yellow Point Lodge, built with SvelteKit
(Svelte 5) and Supabase. All business rules — reservation numbering, the
one-year booking horizon, tax calculation, US→CDN conversion, deposit
refund/kept handling — live in the `ypl` database schema (triggers +
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

## Deploying to Cloudflare

The build is a static SPA (`adapter-static` with an `index.html` fallback), so
Cloudflare serves it as an assets-only Worker — there is no server-side
runtime. See `wrangler.jsonc`.

### One-time Cloudflare setup

Connect the GitHub repo in **Workers & Pages → Create → Import a repository**,
then set:

| Setting | Value |
|---|---|
| Root directory | `app` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Build output directory | `build` |

Add these as **build** variables (Settings → Build → Variables). They are read
by `$env/static/public` and inlined into the bundle at build time:

```
PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<publishable key>
```

Do not add the secret or service-role key to Cloudflare. Anything the build can
read can end up in the browser bundle, and those keys bypass RLS entirely.

After that, every push to `main` rebuilds and deploys.

### Deploying by hand

```sh
npm run deploy       # vite build && wrangler deploy
npm run cf:preview   # build and serve locally through workerd
```

### What the config does

- `wrangler.jsonc` — `not_found_handling: single-page-application` sends every
  unmatched path back to `index.html` so client-side routes like
  `/reservations/12345` resolve instead of 404ing.
- `static/_headers` — security headers, plus immutable caching for hashed
  assets and `no-cache` on the HTML shell so clients pick up new deploys.
- `static/robots.txt` and the `X-Robots-Tag` header — keep non-production
  environments out of search indexes.

## How it's wired

- `src/lib/data/client.ts` — Supabase client bound to the `ypl` schema.
- `src/lib/data/queries.ts` — one exported function per `ypl` view/RPC (reads).
- `src/lib/data/mutations.ts` — one exported function per workflow write RPC.
- `src/lib/data/reference.ts` — rooms, inventory, lookups, and current
  tax/exchange rates, loaded from the database once per session.
- `src/lib/report.css` + `src/routes/reports/**` — printed outputs cloned
  from the client's original designs in `original_spec/reports/`; the markup
  and CSS classes match the originals so printed pages are identical.
- `src/lib/components/ui/combobox/` — the one dropdown. A plain select button
  whose list can be narrowed by typing any part of an entry; used for every
  choice on every screen, which is what makes rooms and the priced-item list
  workable. `src/lib/options.ts` builds its option lists.
- `src/lib/pending-charges.ts` — charges and the deposit captured while a stay
  is being booked, posted through the ordinary workflow RPCs once the
  reservation exists.
- `src/lib/components/app/guest-search.svelte` — the one guest lookup, shared by
  the lookup screen, the new-reservation guest panel, the add-a-name dialog and
  the Print Center, so partial-name search behaves the same everywhere.

Screens are intentionally minimal: Lookup (home), Name/Date/All-fields search
results, Guest history, the Reservation transaction screen, the Print Center,
and the Daily Cash Activity Report with its appendices.

## Verification

- `supabase/tests/business_logic_smoke.sql` — full workflow smoke test of the
  database layer (transactional; rolls back).
- API-level and browser-level end-to-end checks were run against the local
  stack: sign-in gate, reservation creation, charges/payments, room moves,
  cancellation with deposit refund, and every printed report.
