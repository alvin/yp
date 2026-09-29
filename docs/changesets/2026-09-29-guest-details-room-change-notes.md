# Changeset — guest details, changing a room, clearing notes (round 7)

**Date:** 2026-09-29
**Trigger:** the owner's decisions on the open items left by round 6.
**State:** `npm run check` clean, every feature test passing,
`business_logic_smoke.sql` passing. `0016` applied to the local stack. `0014`,
`0015` and `0016` are not yet applied to the hosted project; apply all three (in
order, one `begin … commit`) before pushing the app.

---

## 1. Guest details can be corrected

**Shipped.** *Edit details* on the guest's page opens every field the front
desk keeps: title, names, address, phones and their types, email. A changed
field is saved; an emptied field is cleared; the last name can be changed but
not emptied. Access's `frmGuest` was a plain bound form, every field editable,
nothing checked beyond voiding. This is the same, minus voiding (not asked for).

**Bug fixed.** Attaching an existing guest while booking filled the form, but
saving ignored any correction, although the story said they could be made. The
corrections are now saved to the guest's record. Details the booking form
doesn't show (second phone, phone types, company) are left as they were.

**Where:** `0016` — `update_guest` now sets a field given as text, clears it on
an empty string, and keeps it when null (it could never clear a field before);
`guest-fields.svelte` (shared by the booking screen and the new
`guest-details-dialog.svelte`), `guest-form.ts`. Story
`correct-a-guests-details.feature`; `attach-an-existing-guest-to-a-new-reservation`
now asserts the save.

**Judgement call — a value on file that isn't on the lodge's list still shows.**
About 3,100 guests have phone type "Phone", which isn't on the lookup list. The
dropdown offers it for that guest, so the form shows what the record holds.

**Also:** optional dropdowns (title, phone types, diet) open with an empty entry
so a choice can be taken back; the guest card no longer reads "Smith, " for a
guest with no first name.

## 2. A stay's room can be changed outright

**What Access did.** Staff overtyped the room on the occupancy row. There was no
event code, no availability check and no link to the charges. Room charges were
separate lines that kept the room and rate they were posted with. The legacy
data shows the cost: 387 room-charge lines (318 stays) bill a room the stay
isn't in. In 128 room swaps, each party is charged for the other's room.

**Shipped.** A pencil beside each room in *Rooms & moves* opens *Change room*.
It offers every other room and marks those another stay holds for the same
nights *Booked*. Two guards, in the room_assignments trigger so direct database
edits keep them too:
- **A room charge for the old room is posted over those nights:** the change is refused. Remove the charge, change the room, then post the new one. This is the Access bug, prevented.
- **The new room is the one the stay moves from or to next door:** the change is refused, pointing to *undo the move* instead. Otherwise the stay would print as two rows in the same room.

**Not built:** editing a room row's dates or guest count, which Access allowed
on the same row. Stay dates change through *Change dates*.

**Where:** `0016` — `room_assignments_autofill`; the app calls the existing
`update_room_assignment`. Story `change-a-stays-room.feature`.

## 3. Notes: what's in the box is what prints

Checked every note field by saving it empty:

| Field | Before | Now |
|---|---|---|
| Guest notes, reservation notes, requests | cleared | unchanged |
| Diet notes | cleared; but the diet itself could only be set while booking, and an empty tab created an empty diet record | the Kitchen tab has the Diet dropdown too; set to None with empty notes, the diet is cleared; nothing is created from an empty tab |
| Housekeeping note | refused with an error ("Housekeeping note text is required") | cleared: the notes in force are archived so none prints, and the dated history is kept |
| Booking screen, returning guest's diet | emptying it didn't save, so the old diet stayed | cleared |

**Where:** `0016` — `set_housekeeping_note`; the reservation page's Kitchen and
Housekeeping tabs and the booking screen. Criteria added to
`print-diet-and-housekeeping-notes-on-guest-documents` and
`capture-housekeeping-and-diet-notes-when-booking`.

## 4. Notes on charge lines — findings, nothing changed

Asked: what is the "Notes (optional)" field on a charge, where should it go,
what did Access do?

- **In Access** the charges subform had a "Notes:" column (`TransNotes`, "Transaction Notes"). No printout used it. The check-out bill printed the item's description, or for a room its name and number (`qrySubreportCheckOutBillTransaction`: `RoomInv: [InvItemDescription] & [RoomName] & " " & [RoomNumber]`), never the note and never the word "Room".
- **Staff barely used it:** 1 of 55,760 legacy charges has a note (a "3" on a glass of house wine).
- **This app goes further than Access.** On a room line the note prints on the bill ahead of the room ("Deluxe upgrade – Lodge #05", a round 3 judgement call). On an item with no description, the note stands in for the description. The field's placeholder says "Overrides the line description", which is only true for rooms.
- **Recommendation:**
  - Treat the note as Access did: shown on the ledger beside its line, never printed.
  - Drop the "Overrides the line description" placeholder.
  - Bills print the item description, and rooms "Room – Lodge #05" as the lodge asked in round 3.

  There is no separate description column on a charge to save it into, and none is needed: the description comes from the item or room.

## 5. Weak tests

Recorded in `docs/test-review-2026-09-29.md` for review, sorted into obvious
fixes, obvious removals, and decisions. None were changed except those in
stories this round touched.

---

## Active issues

One list of everything open, replacing the lists in rounds 5 and 6.

**Waiting on the owner**
1. **Deploy** `0014`, `0015`, `0016` to the hosted project, then push the app. The live app is two rounds behind.
2. **Charge-line notes** — the recommendation in §4.
3. **Weak tests** — `docs/test-review-2026-09-29.md`.
4. **Date-range search** — sorted by arrival rather than name, and never shows the Cancelled or Shared badge.
5. **UserForge** — delete the removed stories' ids by hand (listed in round 6).

**For the lodge**
6. **Gift certificates** — the story is marked done but there's no button to sell one.
7. **Daily Cash and US funds** — the US tender lines and "All US amounts converted" note on the Daily Cash report and appendices, deferred by the lodge to "Feedback 1.1".
8. **Questions still open from the original pack:**
   - the weekly spreadsheet handoff
   - storing DCAR actual amounts, staff-tip codes and adjustments, and against which accounting codes
   - how a stay with several named occupants shows on the guest side
   - the flow for printing or reprinting a single document
   - pixel copies of the Access layouts versus matching data and wording
   - split bills beyond percent-of-bill
   - moving a deposit when a stay is cancelled or re-booked
9. **Legacy room charges** — 387 legacy room-charge lines bill a room the stay isn't in (§2). The lodge may want to know, since old bills and history reflect them.

**Known gaps, not requested**
10. **Room rows** — a room row's dates and guest count can't be edited, as they could in Access.
11. **Multi-guest notes** — on a stay with several guest names, the notes tabs edit the primary guest's diet, housekeeping note and requests only.
12. **All-fields search speed** — it takes a few hundred milliseconds whatever is typed. Left for now.
