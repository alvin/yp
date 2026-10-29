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
previous runs (fixtures book as `QA` with `ZZ…` guest names). Run one suite at
a time: a second run's cleanup deletes the first run's fixtures.

## Writing tests

- **Test at the most reliable layer.** Database behaviour and report content
  through the `ypl` RPCs (`rpc(...)` from `helpers/db.ts`); screen behaviour
  through Playwright. Prefer the screen when the criterion is about what staff
  see or do.
- **Create your own data** with `makeReservation(...)` and the posting helpers
  in `helpers/db.ts` — `pay`, `postRoomNights`, `postCharge` (with
  `pricedItem` for an item to charge), `cancel`, `insertTaxedCharge` — and read
  it back with `ledger`, `roomWindows`, `firstOccupancyId`, `searchByDate`,
  `dcarLine` and `roomDirectory`. Each defaults to the fixture's own dates and
  the first room. Never depend on data another test created.
- **Isolated dates**: `makeReservation()` defaults to `isolatedDate()` — a
  historical business date no other test, worker, or run touches. Day-scoped
  assertions (reports, daily cash) are exact on those dates.
- **Rate-dependent lines** (taxes, exchange): the dated rate tables only cover
  modern dates, so use `todayISO()` as the *transaction/payment date* when a
  test asserts tax or CDN amounts, and first assert the rate itself is non-zero
  (and the exchange rate not 1), or a broken calculation passes. Never make
  exact day-scoped report assertions on today (other activity exists) — filter
  to the test's own reservation. To put an exact tax on an isolated date,
  write the charge with `insertTaxedCharge`.
- **Assert the exact value** the fixture determines — a count, an amount, a
  date — not `> 0` or "truthy", and check a list's length before looping over
  it. A call that throws on failure needs no `id > 0` after it.
- Fixture guests must keep the `ZZ` last-name prefix and bookings the `QA`
  booked-by code so cleanup finds them; anything a test searches for by text
  carries a `uid()` so earlier runs' data never matches it.
- **Browser tests**: `const page = useAppPage()` (from `helpers/app.ts`) at the
  top of a file or `describe` opens one signed-in page before its tests and
  closes it after; `useAppPage('/print')` also lands on a screen. Let
  Playwright wait: `locator.waitFor()`, `page.waitForURL(...)` and
  `expect.poll(...)` for anything the screen updates, never `waitForTimeout` or
  an unpolled read straight after a click. `field(page, label)`,
  `printedDate()`, `printedDay()` and `screenDate()` read the reservation
  screen's fields and dates the way they are shown.
- Do not truncate tables or delete data inside tests.

## Environment

Defaults target the local stack; override with `TEST_SUPABASE_URL`,
`TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY`, `TEST_APP_URL`,
`TEST_STAFF_EMAIL`, `TEST_STAFF_PASSWORD`.
