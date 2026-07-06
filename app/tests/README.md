# Feature test suite

One test file per story in `spec/features/` — `tests/features/<slug>.test.ts`
for `spec/features/<slug>.feature`. The mapping is enforced by
`tests/coverage-map.test.ts`, so a new story without a test (or vice versa)
fails the build.

## Running

```sh
supabase start   # once, from the repo root
npm test         # in app/
```

Global setup verifies the stack, creates the staff login if needed, starts the
dev server when nothing answers at `TEST_APP_URL`, and deletes data left by
previous runs (fixtures book as `QA` with `ZZ…` guest names).

## Writing tests

- **Test at the most reliable layer.** Database behaviour and report content
  through the `ypl` RPCs (`rpc(...)` from `helpers/db.ts`); screen behaviour
  through Playwright (`openAppPage()` from `helpers/app.ts`).
- **Create your own data** with `makeReservation(...)` / `rpc('create_guest')`.
  Never depend on data another test created.
- **Isolated dates**: `makeReservation()` defaults to `isolatedDate()` — a
  historical business date no other test, worker, or run touches. Day-scoped
  assertions (reports, daily cash) are exact on those dates.
- **Rate-dependent lines** (taxes, exchange): the dated rate tables only cover
  modern dates, so use `todayISO()` as the *transaction/payment date* when a
  test asserts tax or CDN amounts. Never make exact day-scoped report
  assertions on today (other activity exists) — use unique names and `>=`.
- Fixture guests must keep the `ZZ` last-name prefix and bookings the `QA`
  booked-by code so cleanup finds them.
- Browser tests: `const page = await openAppPage()` (signed in) in
  `beforeAll`, `await closeApp(page)` in `afterAll`.
- Do not truncate tables or delete data inside tests.

## Environment

Defaults target the local stack; override with `TEST_SUPABASE_URL`,
`TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY`, `TEST_APP_URL`,
`TEST_STAFF_EMAIL`, `TEST_STAFF_PASSWORD`.
