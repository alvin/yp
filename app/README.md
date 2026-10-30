# Yellow Point Lodge — Front Desk

Production front desk system for Yellow Point Lodge, built with SvelteKit
(Svelte 5) and Supabase. All business rules — among them reservation
numbering, the one-year booking horizon, tax calculation, US→CDN conversion,
deposits refunded, kept or applied at check-out — live in the `ypl` database schema (triggers +
RPCs), so the data stays consistent even when rows are edited directly in
Supabase.

The desk takes Canadian funds only: the payment screens offer no choice of
currency and no US tender type. The conversion is untouched in the database,
so records already on file and rows written directly still carry their CDN
value, and the Daily Cash Activity Report still reports it.

A guest's diet is kept as notes, in the guest's own words, and a party is
booked as its number of adults. Access's diet types, child counts and group
names stay in the database for the old records that carry them, but no screen
asks for them. A diet type on file prints ahead of the notes, as it always has,
so the screens show it in the notes, and saving them keeps it there as text.

Each note on a stay prints where the lodge reads it. The Notes for reports tabs
hold the diet, the housekeeping note, the guest's requests and each room's
occupancy notes; the guest's notes and the reservation's own notes are for the
office and print on nothing. The reservation's notes are Access's `ResNotes`,
which the lodge kept as a record of the booking, while messages for the guest
were always the occupancy notes, printed under the room on the confirmation.

## Setup

1. Start (or connect to) the Supabase project. Locally:

   ```sh
   # from the repo root
   supabase start        # applies supabase/migrations + seed.sql
   ```

2. Expose the `ypl` schema (already configured in `supabase/config.toml` for
   local; for a hosted project set Project Settings → API → Exposed schemas).

3. Create a staff login (email + password). The admin login,
   `admin@yellowpointlodge.com`, comes with the seeds (`supabase/seed_admin.sql`);
   the front desk login is made by hand — locally:

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
- `src/lib/data/reference.ts` — rooms, inventory, lookups, and the current tax
  rates, loaded from the database once per session. It also holds the bed-layout
  labels: the lodge reads the choice as Regular or Split, the Access vocabulary
  `Double`/`Twin` is what is stored, and only the label changes.
- `src/lib/report.css` + `src/routes/reports/**` — printed outputs cloned
  from the client's original designs in `original_spec/reports/`; the markup
  and CSS classes match the originals so printed pages are identical. The one
  departure the lodge asked for: the daily reports rule off and shade alternate
  lines (`table.ruled`), with the shading set to print.
- `src/lib/print-stock.ts` — the paper each output goes on: daily reports on
  letter, guest slips and folios on A5. A browser cannot choose a printer, so
  `/print/batch` prints one group at a time, each print action carrying its own
  page size: the daily reports together, and each kind of guest document on its
  own, since the folio paper is printed on the back for each kind.
- `src/lib/components/ui/combobox/` — the one dropdown. A plain select button
  whose list can be narrowed by typing any part of an entry; used for every
  choice on every screen, which is what makes rooms and the priced-item list
  workable. With `multiple` it ticks several entries, each with a tick box
  (partly ticked for an entry partly chosen), under group headings if the
  options carry them, with Select all and Clear acting on what is listed (the
  matches, once something is typed). `src/lib/options.ts` builds its option
  lists.
- `src/lib/pending-charges.ts` — charges and the deposit captured while a stay
  is being booked, posted through the ordinary workflow RPCs once the
  reservation exists.
- `src/lib/components/ui/sheet/` and `src/lib/components/app/form-sheet.svelte`
  — the side drawer: the dialog's own primitive, title, description and
  footer, sliding in from the right. `FormSheet` is a form in it, for the line
  picked from a list beside it: the fields, Cancel and the save button as in
  every dialog at the desk, Enter to save, and room at the left of the footer
  for an action on the record (disable, remove). A form opened from inside
  another (a room's rate) carries a way back to it. The admin area's lists
  open their lines in it; any screen can.
- `src/routes/admin/` — the admin area, for the admin login alone
  (`$lib/admin.ts`; the database's `ypl.is_admin()` holds the same rule and
  refuses everyone else's changes). Its navigation bar: **Sales Reports**
  (Items Cashed Out over a range of days, all items or the ones chosen with the
  multi-select dropdowns under the Selected tab), **Item Prices** (items and
  item types), **Rooms & Rates** (the rooms as Access's Room form kept them,
  each with its own dated rates, and the rate codes and room types they use),
  **Taxes** (every dated rate of the five taxes) and **Year End Deposits**
  (Next Year's Deposits over a chosen range). Each list opens its lines in the
  drawer. The admin login lands there on signing in, and its front desk header
  has an Admin button; anyone else who opens `/admin` is taken to the lookup
  screen.
- `src/lib/components/app/help-sheet.svelte` + `src/lib/admin-help.ts` — each
  admin page's help: an info button that opens the page's tasks, step by step,
  in the drawer. The text lives in `admin-help.ts`; a name in `**bold**` there
  is a button, tab or field as the screen shows it, and the help story's test
  fails if one no longer appears on the admin screens.
- `src/lib/components/app/guest-search.svelte` — the one guest lookup, used
  wherever staff find a guest, so partial-name search behaves the same
  everywhere.
- `src/lib/components/app/shared-room-badge.svelte` — the red *Shared* mark for
  a room two live reservations hold at once. A reservation is booked under one
  guest, so two parties sharing a room are two reservations, each marked
  Shared.

Screens are intentionally minimal and follow the client's original wireframes in
`original_spec/wireframes/`, starting from the Lookup screen (home).

## Verification

- `supabase/tests/business_logic_smoke.sql` — full workflow smoke test of the
  database layer (transactional; rolls back).
- `npm test` — one test in `tests/features/` per story in `spec/features/`;
  see `tests/README.md`.
