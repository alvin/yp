# Changeset — a room holds a night (round 11)

**Date:** 2026-10-05
**Trigger:** the owner undid a move made on the check-out date (round 10) and
found the original room running to the extended departure; looking into it
turned up rooms on file with no nights.
**State:** `npm run check` clean, every feature test and `business_logic_smoke.sql`
passing. `0021` applied to the local stack and, on 2026-10-05, to the hosted project
(in one `begin … commit`, before the app was pushed). Verified afterwards: no
live room without a night; the five archived; both function bodies match
local exactly; #113181 is Victoria 02 then Madrona, #114203 is Lodge 01.

---

## Undoing a move on the check-out date — kept as it is

Undoing a move keeps the guest in the room they were leaving for as long as the
move ran. For a move made on the check-out date, that is the extended stay.
Nothing records that the stay used to end earlier: a move on the check-out date
leaves the same shape as any other move. Undo could only wind the dates back if
the move recorded the original departure.

**Decision (owner, 2026-10-05): keep it.** It suits the reason the lodge asked
for undo — a room frees up and the guest needn't move — and the desk uses
*Change dates* when the guest isn't staying on. No change made.

---

## Rooms with no nights

**Found.** Five live rooms on the hosted project opened and closed on the same
day, all written by this app (Access has none):

| Reservation | Rooms | How |
|---|---|---|
| #113181 | Millie, 11 Aug 2026 | A move on the check-out date, then *Change dates* back to the old departure: the room moved into was cut back to the day it opened |
| #114203 | Attic, Penthouse, Field Cabin 08, Barracks 16, all 2 Oct 2026 | Written with no nights directly; *Add another room* let Out equal In |

None carried a charge. Rooms held on a day (`rooms_held`, 0014) counts the day a
room is left, so each appeared on its day's reports as a room arriving and
leaving.

**Shipped.** `0021_a_room_holds_a_night.sql`:
- the five are archived, as undoing a move archives a room;
- changing the stay dates takes off (archives) any room the new dates leave with
  no nights — the room moved into when the stay now ends on the move day, or the
  room being left when it now arrives on the move day
  (`reservations_sync_room_dates`);
- a new trigger, `room_assignments_hold_a_night`, refuses any live room whose
  out date isn't after its in date, however it is written.

*Add another room* offers an Out date from the night after In, and *Add room*
stays disabled otherwise. No copy changed.

Criteria added to `change-the-dates-of-an-existing-reservation.feature` and
`record-room-moves.feature` (which covers the rooms dialog), with tests.

**Judgement call — a separate trigger.** The rule sits in its own small trigger
rather than inside `room_assignments_autofill`, which carries the room-change
rules from `0016`; it can be dropped on its own.

**Not changed:** shortening a stay to before a move's date still fails with the
existing "Occupancy end date must not be before its start date". That room
would run past the stay, so refusing is right; undoing the move first is the
way through.

**To back out:** drop the `room_assignments_hold_a_night` trigger and function;
restore `reservations_sync_room_dates` from `0008`; set the Add another room Out
box back to `min={mIn}` and its button to `disabled={mMode === "move" && !moveDateOk}`.
The five rooms can be un-archived by `occupancyid` (138055 and 134031–134034).
