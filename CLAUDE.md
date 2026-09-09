# Working in this repo

## UI copy is for the front desk, not for the changelog

These screens are used by lodge staff mid-phone-call. Copy is the shortest
thing that lets them act, and it stays that way as the system grows.

- **Never narrate a change in the UI.** No "now matches…", "you can also…",
  "several keywords are supported"; no examples picked to demonstrate a fix
  (`-illington`, `Karen Abbotsford`). What changed and why belongs in the
  commit, the `.feature` story, and the summary to the client — never on
  screen.
- **Don't explain new behaviour in place.** If a field needs a paragraph to be
  understood, the field is wrong. Fix the field.
- **A behavioural change leaves existing copy alone.** Moving a search into a
  shared component must not alter one word of its placeholder, helper text, or
  empty state. Diff the strings before finishing.
- **New copy matches its neighbours**: a label, plus at most one short factual
  line — "Prints on the housekeeping report.", "Posted when the reservation is
  saved.", "Both rooms stay in the stay history." Open the nearest card or
  dialog and match its register.
- Toasts state the outcome ("Removed Soft Drink"), never the mechanism.
- Rationale belongs in code comments, the story's acceptance criteria, and the
  READMEs. Developers read all three; the front desk reads none of them.

## Reach for what is already there

- Every dropdown is `src/lib/components/ui/combobox/` — a select button whose
  list narrows as you type. Don't hand-roll a picker; add options to that.
- Every guest lookup is `guest-search.svelte`. One search, everywhere.

## Everything else

- Business rules live in the database (`supabase/migrations/`), never only in
  the app, so direct Supabase edits stay consistent. See `supabase/README.md`.
- Printed reports clone the originals in `original_spec/reports/` exactly.
- One story in `spec/features/` ↔ one test in `app/tests/features/`;
  `app/tests/coverage-map.test.ts` fails the build otherwise.
- Each round of client feedback gets a record in `docs/changesets/` — what was
  asked, what shipped, the judgement calls, and how to back each one out. Read
  the latest before revisiting work; add one when you finish a round.
- Before calling anything done: `cd app && npm run check && npx vitest run`,
  and apply any new migration to the local stack first.
