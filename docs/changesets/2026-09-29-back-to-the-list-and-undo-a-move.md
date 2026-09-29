# Changeset — back to the list, undo a room move, accurate room status (round 5)

**Date:** 2026-09-29
**Trigger:** two items of written feedback from the lodge, and a status bug found while building the second.
**State:** 126 stories, 125 feature test files (one story still `@status:backlog`), 468 tests passing. `npm run check` clean, `business_logic_smoke.sql` passing. `0012` and `0013` applied to the local stack and, on 2026-09-29, to the hosted project.

## What this document is for

The same shape as rounds [1](2026-09-09-front-desk-input-feedback.md)–[4](2026-09-28-guest-document-notes-and-room-rate.md):
what was asked, what shipped, where it lives, the judgement calls, and how to
back each one out. The three items are independent.

---

## Delivery summary

| Area | Change |
|---|---|
| Database | two new migrations, `0012_undo_room_move.sql` and `0013_accurate_occupancy_status.sql` |
| Spec | 3 new stories (123 → 126) |
| Tests | 3 new test files (448 → 466 tests) |
| App | the reservation screen and its loader, 1 query, 1 mutation, the status badge, the In House report body |

New DB objects in `0012`: `ypl.room_moves(int)`, `ypl.undo_room_move(int, int)`.
`0013` replaces `ypl.occupancy_status` and `ypl.report_in_house`.

**Deploy:** `0012` and `0013` were applied to the hosted project on 2026-09-29,
in one `begin … commit`, **before** the app was pushed — the reservation screen
loads `room_moves`, and the badge and In House report expect the new statuses.
Verified afterwards: the four function bodies match local exactly;
`authenticated` can execute them; `room_moves` finds 5,234 moves; no room held on
any of the last 730 days is left without a status; today's room badges read
Past 29,718, Future 2,642, In House 31, Arrive Today 23, Depart Today 25,
Move In 4, Move Out 4 (previously 36,186 read In House).

---

## 1. Backing out of a reservation returns to the list it was opened from

> *"When a guest is 'looked up' and a list of their past, present and future reservations is provided, when a record is selected and viewed, when you 'back out' it goes back to the 'lookup' screen. Would it be possible to just back up to the previous returned list of reservations for that particular guest?"*

**Why it happened.** The reservation screen's top-left button was a fixed link
to the lookup home (`href="/"`), however the reservation was reached. The
browser's own Back button already returned to the guest's list; the on-screen
button didn't.

**Shipped.** Opened from a guest's reservations, a date search, or an
all-fields search, the button reads **Back** and returns to that list (the
browser's history, so the list's scroll position comes back too). Opened any
other way — by reservation number, a direct link, after saving a new
reservation — it reads **Lookup** and goes home as before.

**Where:** `app/src/routes/reservations/[resnumber]/+page.svelte` (`afterNavigate`
records where the screen was opened from). Story
`return-to-the-list-a-reservation-was-opened-from.feature` with its test.

**Judgement call — the label follows the destination.** "Lookup" on a button
that goes to the guest's list would be wrong. "Back" is what the report screens
already call the same thing (`report-shell.svelte`).

**Judgement call — only lists count.** Arriving from another reservation (a
shared-room link) or from the new-reservation form still goes to Lookup: going
"back" into a just-saved form would reopen it.

**Not changed:** backing out of the *guest* page still goes to Lookup with the
name box empty. The request was about reservations; if the lodge wants the
typed name kept too, that is the next step.

**To back out:** restore the single `href="/"` button and remove the
`afterNavigate` block.

---

## 2. A room move can be undone

> *"Is there a way we could 'undo' a move like we can now delete a charge with that sweet, little garbage can? … They may book a 'move', then something comes up and they don't have to move, so we need to be able to cancel just the 'move'."*

**Why it wasn't possible.** `record_room_move` writes a move as two windows:
the room being left is cut short at the move date and the new room opens there.
Nothing reversed that. Archiving the new room alone would have left the nights
after the move with no room at all.

**Shipped.** Each move row in *Rooms & moves* carries the same hover garbage can
as a charge line. Confirming ("Undo this move?" — "The stay keeps White Beach 05
to 28-Mar-27.") archives the moved-to window and runs the room being left on to
where the move ended. The toast mirrors the one for recording a move:
"Room move undone — Rustic Beach 04".

**Where:**
- `0012` — `room_moves(p_reservationid)`, `undo_room_move(p_occupancyid, p_from_occupancyid)`
- `app/src/routes/reservations/[resnumber]/+page.svelte` and `+page.ts`; `roomMoves()` in `queries.ts`, `undoRoomMove()` in `mutations.ts`
- Story `undo-a-room-move.feature`, test `app/tests/features/undo-a-room-move.test.ts`

**Judgement call — what counts as a move.** The data doesn't label moves, so a
move is a window that opens, for the same guest, in another room, on the day
another window closes. That finds all 5,131 moves in the imported data (263 on
upcoming stays). The stay's first room and a room added *alongside* another
(Add another room) get no garbage can and the database refuses them.

**Judgement call — two rooms moving on one day.** A party in two rooms that both
move on the same date leaves two windows closing that day, and nothing records
which became which. 60 moves are like this, 5 on upcoming stays. The dialog then
shows a **Moving from** picker and won't undo until one is chosen; the database
refuses to guess.

**Judgement call — out and back is one room.** Undoing the middle of
A → B → A leaves one A window for the whole stay, not two A rows on the folio.

**Judgement call — charges are not touched.** Room nights are posted during the
stay (14,125 of 16,749 recent room lines; 50 were posted ahead), so a move
undone before it happens has none. If the moved-to room was already charged,
that line stays on the ledger to be removed with its own garbage can — the
rates may differ, and the desk should decide what the guest is billed.

**Judgement call — no availability check.** If another party now holds the room
being kept, the existing *Shared* flag shows it after the undo. The lodge shares
rooms on purpose, so it is shown, not barred — the rule `shared_room_occupancies`
already follows.

**To back out:** remove the garbage can, the undo dialog and the `moves` state
from the reservation screen, and `roomMoves` from its loader. The two functions
can stay; nothing else calls them. Moves already undone can be restored by
un-archiving the moved-to window and setting the kept window's `occupancyout`
back to the move date.

---

## 2a. The move dialog offers only dates a move can fall on

Found in review on 2026-09-29: recording a move on a stay arriving that day
failed with "Move date … must fall inside the current occupancy". The dialog
always started on today's date and accepted any date, but `record_room_move`
only allows a date after the first night and before the last morning of the
room being left — so for any stay not yet under way, the starting date was
always refused.

**Shipped.** The date box offers only those dates (`min`/`max`), starts on
today when today is one of them and otherwise on the first, re-starts when a
different room is chosen, and *Record move* stays disabled for a date outside
them. No copy changed. The database rule is unchanged and still enforces it.

**Where:** `app/src/routes/reservations/[resnumber]/+page.svelte`. One criterion
added to `record-a-room-move-with-move-dates-and-occupancy-context.feature`,
tested in the browser.

**Not built:** changing a stay's room outright (not a move) still has no button
on the reservation screen; `update_room_assignment` exists in the database.

---

## 3. A room's status for the day is worked out, never assumed

Found while building item 2: every room in *Rooms & moves* on a past or future
stay was badged "In house".

**Cause.** `ypl.occupancy_status` (0003) named four cases — Move In, Arrive
Today, Depart Today, In House — and called everything else "In House". It is
the one rule behind three places:

| Where | Effect of the catch-all |
|---|---|
| Room badges on the reservation screen (`v_occupancy_summary.status_today`) | 32,493 of 32,592 room rows read "In house" wrongly — every past and future stay, and the not-yet-reached room of a stay that moves |
| Housekeeping report | the room a party leaves on a move day read "In House" — 2,143 times in the last two years, on 545 of 730 days |
| In House report | the same room listed under In House, and the moving party counted twice in Total Guests |

The reservation header badge, the guest's future/present/past history and the
date search each classify dates explicitly and were already right.

**Shipped.** `0013` names every case: **Future** and **Past** for a room not
held that day, **Move Out** for the room being left mid-stay, and **In House**
only for a held room with no arrival, departure or move in it. The In House
report prints a Move Out section after Move In, and Total Guests counts a
moving party once (in the room it moves into). The badge shows "Future",
"Past" and "Move out".

**Verified:** of every status the reports produce for every room held on every
day from two years back to a year ahead, the only change is 2,447 rooms going
from "In House" to "Move Out"; 61,281 are identical and no held room is left
without a status. Today's room badges read Past 29,855, Future 2,645, In House
31.

**Where:** `0013_accurate_occupancy_status.sql`; `status-badge.svelte`,
`in-house-body.svelte`. Story `show-an-accurate-room-status-for-the-day.feature`
with its test.

**Judgement call — Move Out is a new word on two printed reports.** The
originals carry only Arrive Today, Depart Today, In House and Move In, and no
Access query survives to show what they printed for the room being left.
Chosen by the lodge's side on 2026-09-29 because housekeeping needs to know the
room turns over.

**Judgement call — the In House summary line.** Its "In House" count no longer
includes rooms being left on a move day, and Total Guests no longer counts a
moving party twice. Both were overstated before.

**Left alone:** the badge for Move In still reads "Room move". A room added
partway through a stay (not a move) still reads Move In on its first day, and a
room given up early reads Move Out on its last — both describe what happens to
the room.

**To back out:** restore `occupancy_status` from `0003` and `report_in_house`
from `0010`; revert the badge map and the In House report body.
