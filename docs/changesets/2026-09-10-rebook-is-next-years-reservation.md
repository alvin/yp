# Changeset — re-book is next year's reservation (round 2)

**Date:** 2026-09-10
**Trigger:** the lodge tried the `re-book` action shipped in [round 1](2026-09-09-front-desk-input-feedback.md) against a *depart today* record and found it cancelled the stay the guest had just taken. Plus a standing correction: the one-year booking horizon must not stand in the way of re-booking.
**State:** 114 stories, 113 feature test files (one story still `@status:backlog`), 379 tests passing. `npm run check` clean, production build clean, `business_logic_smoke.sql` passing, local database verified byte-identical to the migration chain.

## What this document is for

The same shape as round 1: what was asked, what shipped, where it lives, the judgement calls, and how to back each one out. Read it before revisiting re-booking or the booking horizon.

---

## The misunderstanding being corrected

Round 1 read "re-book" as a reservation-level operation — *move this stay to new dates*. So `ypl.rebook_reservation` created the new booking, transferred any held deposit across with an offsetting refund/received pair, and cancelled the original.

It is not that. Yellow Point runs on an annual cadence: a party leaves and books the same week next season on their way out the door. "Re-book" is **renew for next year** — a *new* reservation for a party the lodge already knows, standing alongside the stay they just took, which is finished, paid and must not be disturbed.

> *"Most of our guests 're-book' for next year meaning a 'new reservation' not a modification to an existing reservation … a 're-book' should probably just transfer the name, contact, diet, etc. to 'new reservation' and allow us to confirm or change the room and dates and not cancel the previous reservation."*

Read that way the feature is almost entirely presentation: the new stay is an ordinary reservation written by the ordinary RPC, and re-booking is the shortcut that opens the new-reservation screen already filled in.

---

## Delivery summary

| Area | Change |
|---|---|
| Database | one new migration, `supabase/migrations/0009_rebooking.sql`; `ypl.rebook_reservation` dropped; booking horizon narrowed to one rule |
| Spec | 1 new story, 1 rewritten, 1 deleted (114 stories, unchanged count) |
| Tests | 1 new test file, 2 rewritten, 1 deleted; one latent hang in the test harness fixed |
| App | re-book routes to the new-reservation screen; re-book dialog and `rebookReservation` deleted; new-reservation screen seeds from a source stay; one race fixed |

**Deploy:** `0009` is applied locally only. Staging/production need it before the app is deployed — the `run_remote_sql.py` command in `supabase/README.md` lists it.

**Local database:** the working database carried hand-applied experiments from an abandoned attempt (a `ypl.booking_horizon(date)` helper, a `rebook_reservation` with a `p_roomid` argument, and a `ypl.rebooking` session flag the `reservations` trigger consulted to skip the horizon). All of it was reverted to the committed definitions before `0009` was written, and `pg_dump --schema-only -n ypl` of the working database is now byte-identical to a database built from `0001`–`0009` alone. Nothing in `0009` depends on those experiments and none of them reached staging.

---

## 1. Re-book creates a new reservation and leaves the old one alone

**Shipped.** The **Re-book** action on the reservation screen now opens the new-reservation screen at `/reservations/new?from=<resnumber>`, carrying the party forward:

| Carried | From |
|---|---|
| Name, salutation, company, full mailing address, phone, email | the guest record — the new stay attaches the *same* guest, so nothing is copied |
| Diet and diet/allergy notes | `kitchen_meals`, which is keyed by guest, not by stay |
| Arrival and departure | the source stay, 52 weeks on, same length of stay |
| Adults, children, bed type, group name, room | the source stay |

Every field is editable before saving — the screen is the confirmation step the client asked for. Saving writes an ordinary reservation through `ypl.create_reservation` with `resnotes` set to `Re-booked from #<resnumber>`, and the reservation it came from is not read again: not cancelled, not re-dated, still holding its own deposit and charges.

**Where:**
- `app/src/routes/reservations/[resnumber]/+page.svelte` — the action is a link now; the re-book dialog, `doRebook()` and their state are gone
- `app/src/routes/reservations/new/+page.ts` — `?from=` loads the source stay and its room, and computes next season
- `app/src/routes/reservations/new/+page.svelte` — seeds from it; one added line of copy, "Re-booked from #12345."
- `app/src/lib/format.ts` — `nextSeason()`
- `app/src/lib/data/queries.ts` — `guestKitchenMeal()`
- `app/src/lib/data/mutations.ts` — `rebookReservation` deleted
- `0009` — `ypl.rebook_reservation` dropped
- Story `spec/features/re-book-a-stay-for-next-year.feature`, test `app/tests/features/re-book-a-stay-for-next-year.test.ts`

**Judgement call — 52 weeks, not one calendar year.** The dates offered are the source stay **+364 days**, so a Saturday arrival stays a Saturday arrival. This is measured, not assumed: across 16,313 pairs of consecutive visits by the same guest 330–400 days apart in the Access data, the commonest gap between one arrival and the next is 364 days (10,524 pairs), four times more common than any other; the runner-up is 371 (53 weeks, 2,069). A calendar year — 365 or 366 days — accounts for 750. Where the source stay is an old one, the step repeats until it lands on or after today, so re-booking works from anywhere in a guest's history.

**Judgement call — the deposit stays where it was taken.** `rebook_reservation` moved any held deposit onto the new stay. For a *renewal* that is wrong twice over: the money was taken for the stay the guest actually took, and moving it silently empties a finished booking. A deposit for next year is taken for next year, on the new reservation, in the "Charges & deposit" panel that round 1 put on this screen. The deliberate-cancellation path is unaffected — `cancel_reservation(p_deposit_handling => none|refund|keep)` still refunds or keeps a deposit when a booking really is cancelled.

**Judgement call — no `rebook_reservation` RPC at all.** With the copying gone there is nothing left for it to do that `create_reservation` does not already do, and the project's rule is that a business rule lives in the database. Re-booking is not a business rule; it is data entry. Keeping the function as a second, near-duplicate way to write a reservation would be the scaffolding-with-no-caller that round 1 swept out. The rules that *are* rules — numbering, night count, the horizon — still fire, because the new stay goes in through the same door as every other.

**Known gap, deliberately not built.** A stay carrying a **second name** re-books with the primary guest only; the partner is added on the new reservation with "Add a name", as they are on any new booking. The new-reservation screen has only ever taken one guest, and teaching it to take several is a larger change than this round. It is rare in practice: 7 of 31,108 reservations in the imported data carry a second name.

**To back out:** restore `rebook_reservation` from `0005_business_logic.sql` (its definition is intact there — `0009` only drops it), restore `rebookReservation` in `mutations.ts` and the dialog on the reservation screen from git history, and point the Re-book button back at `openRebook`. The new-reservation screen's `?from=` seeding is independent and can stay either way.

---

## 2. The booking horizon no longer blocks a re-booking

> *"You should ensure that the 1 booking horizon rules do not prohibit re-booking of stays. The 1 global year horizon should be arrival date only and should have a week of grace."*

**Shipped.** One rule, in `ypl.reservations_autofill`, applied when a reservation's dates are set or changed:

```
arrival > current_date + 1 year + 7 days  →  rejected
```

Two things changed. It is measured from **today** alone, where it used to be measured from the later of the booking date and today — the same number for every row the app writes, and a second rule to reason about for every row it does not. And it carries **seven days of grace**. Departure is not checked at all, so a stay that starts inside the window may run past it; that was already true and is now written down.

**Where:** `0009`, `app/src/lib/format.ts` (`oneYearAhead` → `bookingHorizon`, which is what the arrival date inputs cap at, on both the new-reservation and change-dates screens). Story `spec/features/enforce-the-one-year-reservation-horizon.feature` rewritten; test extended with the grace week and the arrival-only case; `business_logic_smoke.sql` gained both.

**Why a week.** The 52-week cadence is the reason. A party re-booking *at departure* has 364 days less the length of their stay to run, comfortably inside a year. A party re-booking on arrival, or shifting to the 53rd week, lands a few days past one. The Access data shows this plainly: **1,986 reservations were booked 366–369 days ahead** — exactly the band a bare year refuses and a week of grace admits.

**Legacy evidence — Access enforced no horizon at all.** Checked, because the instruction invited it. Of 31,104 imported reservations, 5,486 (17.6%) have an arrival more than one year past their booking date, 1,988 more than *two* years, and the longest lead is 5,340 days. The phrase "one year only" appears in the source database 414 times — 401 reservation notes and 13 guest notes, every one of them free text typed by staff, never a validation rule. The one-year horizon is this system's invention, taken from the written reservation policy in `original_spec/requirements.md` (FR-002). Keeping it is right; it is a real policy and it catches genuine date-entry slips. Making it refuse the lodge's core transaction was not.

**To back out:** drop the `+ interval '7 days'` from the trigger in `0009` and from `bookingHorizon` in `format.ts`. Both have to move together or the date input and the database disagree about the last bookable day.

---

## Not asked for, but changed

- **Diet is no longer filed twice.** The new-reservation screen wrote a *new* `kitchen_meals` row every time, so attaching an existing guest and entering a diet gave them two — and `report_kitchen_meal` concatenates every row a guest has, so both printed. Attaching a guest (by search, by `?guest=`, or by re-booking) now loads the diet record they already have and saving revises it. This is in scope because "transfer the … diet" is exactly what the client asked re-book to do, and doing it any other way would have printed the diet twice.
- **The booked-by initials no longer overwrite what was typed.** `supabase.auth.getUser()` resolves after the screen is usable and was assigning the account's initials unconditionally, clobbering anything entered in the meantime. It now only fills while the field is still the default. Latent before; re-booking reaches the screen by client-side navigation, which is fast enough to hit it every time.
- **`tests/global-setup.ts` cannot hang any more.** The cleanup sweeps discarded the result of their deletes, so a row that could not be deleted left them asking for the same rows for ever, with no output. They now surface the error. This cost most of an hour to find, via a test fixture that saved through a screen without setting the booked-by initials — the contract the sweep relies on, now written next to it.
- **READMEs:** `supabase/README.md` (migration `0009` in the contents, order, deploy command and trigger notes; the RPC list says re-booking is not an RPC), `README.md` and `app/README.md` (the deposit "transfer" handling those two advertised no longer exists — refund/kept does).

---

## Verification

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0009_rebooking.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/business_logic_smoke.sql
cd app && npm run check && npx vitest run && npm run build
```

At the time of writing: 379 tests across 113 feature files plus the coverage-map meta-test, 0 type errors, build clean, smoke test passing. The working database dumps identically to one built from `0001`–`0009` and `seed.sql`.
