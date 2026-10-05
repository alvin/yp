# Changeset — moving on the check-out date, ICS Crossover removed (round 10)

**Date:** 2026-10-03
**Trigger:** two items of written feedback from the lodge.
**State:** `npm run check` clean, every feature test and `business_logic_smoke.sql`
passing. `0019` and `0020` applied to the local stack and, on 2026-10-05, to the
hosted project.

The two items are independent.

---

## 1. A move can fall on the check-out date

> *"It looks like the 'room move date selection calendar' is only active within the range of the existing reservation. However, could you extend it one day further, to their check out date? Guests may decide to stay longer if another room is available, but they have to move."*

**Why it wasn't possible.** `record_room_move` (0005) took a move date strictly
inside the room being left — after its first night, before its last morning —
and the dialog's date box (round 5, item 2a) offered only those dates. A move
on the check-out date has nowhere to run: the new room would open and close the
same day.

**Shipped.** For the room the stay ends in, the date box now runs to the
check-out date. Choosing it brings up a **Departure** box below it, starting
one night on; *Record move* stays disabled until it is after the move
date. Recording it moves the stay's departure there, closes the room being left
on the old check-out date and opens the new room for the added nights. The
toast is the usual "Room move recorded — …". No existing copy changed.

**Where:**
- `0019_move_on_the_check_out_date.sql` — `record_room_move` gains `p_out date
  default null`. The old four-argument function is dropped first, so there is
  one signature.
- `app/src/routes/reservations/[resnumber]/+page.svelte` (`moveDates`,
  `extending`, the Departure box); `recordRoomMove()` in `mutations.ts`.
- Story `record-room-moves.feature`: the move-date criterion now reads through
  the check-out date, and one criterion added for the extension. Tested in the
  database and in the browser.

**Judgement call — one extra box, only when it is needed.** Extending a stay
needs a departure; the shortest way to ask is the same "Departure" the
*Change dates* dialog uses, shown only for a move on the check-out date and
defaulting to one more night. The alternative — always add one night, change
the dates afterwards for more — needs no new box but makes the desk do the
second step for any stay longer than a night.

**Judgement call — only the room the stay ends in.** An earlier room in a stay
that already moves ends on the day the next room starts; moving out of it on
that day would put two rooms on the same nights. The dialog doesn't offer it
and the database refuses it.

**Judgement call — the new room alone covers the added nights.** Changing the
stay's departure normally carries every room ending on it along
(`reservations_sync_room_dates`, 0008). Here a party holding a second room
alongside keeps that room to the original date: only the guest moving is
staying on. The guests on the stay follow the new departure, as they do when
the dates are changed.

**Judgement call — no availability check.** As with every other room choice,
a room another stay already holds shows as *Shared* afterwards; the lodge
shares rooms on purpose.

**Undoing such a move** (the garbage can, round 5) keeps the stay in the room
it was leaving through the new departure. If the guest isn't staying on after
all, *Change dates* brings the departure back.

**To back out:** drop `record_room_move(integer, integer, date, text, date)`
and restore the four-argument function from `0005`; in the dialog, set
`moveDates.max` back to `addDays(o.occupancyout, -1)` and remove `mMoveOut`,
`extending` and the Departure box; drop `out` from `recordRoomMove`. Stays
already extended stay extended.

---

## 2. "ICS Crossover" is off the payment-type list

> *"'ICS Crossover' on the payment type list came from MS Access but it doesn't appear to be used much, so shall I just remove it? Yes, please turf that."*

**Shipped.** `0020_no_ics_crossover.sql` deletes it from
`lookup_payment_types`, so the payment pickers no longer offer it and the Daily
Cash report no longer prints an ICS Crossover line every day. Removed from
`seed.sql` too, so a rebuilt database matches. Story `show-tender-types.feature`
no longer names it; its test now checks the report lists exactly the lodge's
tender set.

**Judgement call — the one payment keeps its type.** It was used once: a $35
deposit refund on #100084, 17 Sep 2024 (checked on the hosted project
2026-10-03). Rewriting a 2024 refund to another tender would change history.
Since `0014`, the Daily Cash report gives any payment whose type isn't on the
list its own line after the listed ones, so 17 Sep 2024 still prints it and
still adds up (`print-daily-cash-activity-report.feature` covers this). No
foreign key ties payments to the list. The original printed reports in
`original_spec/` never named it.

**To back out:** `insert into ypl.lookup_payment_types values ('ICS Crossover', 29);`
and restore it in `seed.sql`.

---

## Deploy

Apply `0019` and `0020` to the hosted project **before** pushing the app. The
reservation screen now always sends `p_out`, and PostgREST won't find the old
four-argument `record_room_move`, so every move would fail until `0019` is in.
Afterwards check: `record_room_move` has the five-argument signature only, and
`lookup_payment_types` has no ICS Crossover.

**Done 2026-10-05:** both applied in one `begin … commit`, before the app was
pushed. Verified afterwards: `record_room_move` has only the five-argument
signature, its body matches local exactly, and `authenticated` can execute it;
ICS Crossover is off the list, the one payment still carries it, and the Daily
Cash report for 17 Sep 2024 still prints its −$35.00 line.
