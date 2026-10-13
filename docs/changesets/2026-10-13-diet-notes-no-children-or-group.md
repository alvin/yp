# Changeset — a diet is its notes; no children or group when booking (round 14)

**Date:** 2026-10-13
**Trigger:** the lodge asked to drop the diet-type pick list ("We don't really need to
'sub-group' them like that") and the Children and Group fields on New Reservation, re-book
included. They asked for it to be done minimally, without data changes.
**State:** `npm run check` clean, every feature test passing. **No migration:** the
database, the import and every printed output are unchanged, so nothing is applied to the
hosted project. The app went live with its push to `main` on 2026-10-13.

---

## 1. A diet is its notes

> *"Please remove the 'diet type' pulldown that generalizes diets into groups like 'vegan',
> 'vegetarian' etc. We don't really need to 'sub-group' them like that."*

**Shipped.** The Diet pick list is gone from New Reservation (and so from Re-book) and from
the Kitchen tab of a reservation's notes. What's left is the **Diet & allergy notes** box,
which is where the lodge has always written diets.

**Legacy evidence.** Access's pick list (`tblLookupGuestDiet`, eleven types) was used once
in all its history. Of 4,662 diet records, one has a type: "No red meat or pork(Carol)",
free text typed into the type box, with no notes. Every other diet is in the notes. On the
lodge's own sample of the Access 7-day kitchen report, the Guest Diet column is blank.

**Judgement call: no data change, and the type shows in the notes.** The `guestdiet`
column, the lookup table and `save_kitchen_meal` are untouched. A type on file still prints
where it always did, ahead of the notes on one line (`v_kitchen_diets.diet_text`). So that
such a record isn't left with text that prints but can't be seen, the notes box shows the
diet as it prints, type included (`dietText` in `queries.ts`). Saving writes that text as
the notes and clears the type (`saveKitchenMeal` sends no type now). The printed diet is
the same before and after, and a record only changes when someone saves it. The hosted
project has two such records: the Access one, and a "Celiac" set there in testing.

**Not changed:** the 7-day kitchen report keeps Access's separate Guest Diet column. It is
a clone of the original and, as there, blank; once saved, a record's type shows in the
notes column instead. The kitchen report, confirmation and folio print the diet as before.

**To back out:** restore the two Diet comboboxes, `GUEST_DIETS` in `reference.ts`, the
`none` label in `optionalOptions` and the `guestdiet` argument of `saveKitchenMeal` from
git; drop `dietText`.

---

## 2. No children or group when booking

> *"You could also remove the 'children' and 'group' fields from the 'New Reservation'
> (incl. re-book, etc)."*

**Shipped.** New Reservation asks for Adults beside Beds, and Arrival time beside Booked
by. The Children and Group fields are gone, including on Re-book, which no longer carries
them across. A booking saves no children (the column's default, 0) and no group, and its
room takes the number of adults.

**Legacy evidence.** Not one of Access's 30,967 bookings has a child. Fourteen carry a
group name: the six Daily Sales accounts, the Rate Quoter account, and seven stray
keystrokes (`'`, `.`, `\`). The hosted project matches.

**Judgement call: the Number of guests dialog drops Children too.** Last round it was
built to ask what the booking screen asks. It now asks for Adults alone ("Adults for this
reservation."), the one line of existing copy changed, since it named the removed field. A
child count already on file is left alone, still counts in the party and still reads on
the Guests line. None exists outside test data.

**Judgement call: what's on file still shows.** A reservation's Group line, shown only
when it has one, stays, so the Daily Sales and Rate Quoter accounts still say what they
are. All-fields search still searches group names. The columns, `create_reservation` and
`update_reservation` are unchanged; the app simply stops sending children and a group.

**To back out:** restore from git the New Reservation fields and their layout,
`numchildren`/`groupname` in the re-book loader (`new/+page.ts`), the dialog's Children
field, and the `numchildren`/`groupname` inputs in `mutations.ts`.

---

## Not asked for, but changed

- **Saving the Kitchen tab twice filed the diet twice.** On a reservation whose guest had
  no diet on file, saving the Kitchen tab, correcting it and saving again added a second
  diet record rather than revising the first. The kitchen report, confirmation and folio
  then printed both ("No nuts" and "No nuts or shellfish"). The tab now revises the record
  it wrote. The story already said the diet is never repeated, and its test now saves
  twice. Nothing on the hosted project was affected: its one guest with two diet records
  came that way from Access, and the second is blank, so it doesn't print.
- **Stories brought into step:** capture housekeeping and diet notes when booking, print
  diet and housekeeping notes on guest documents, re-book a stay for next year, change the
  number of guests on a reservation, create reservation. `app/README.md` records that the
  desk keeps diets as notes and books adults only, with the Access columns kept.
- The test fixture `makeReservation` no longer takes a child count.
- **A flaky test made steady.** *Correct a guest's details* read the guest page once, right
  after the "Guest details saved" message, but the dialog shows that message before it
  reloads the page. Under a busy run it caught the old city (one failure in two full runs).
  It now waits for the page to show the correction. The app is unchanged.
