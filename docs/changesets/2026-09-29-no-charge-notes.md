# Changeset — charge lines carry no notes (round 8)

**Date:** 2026-09-29
**Trigger:** the owner's decision to remove charge-line notes throughout.

**Why.** The Add charge dialog had a Notes box because the Access charges table
had a `TransNotes` column. Access never printed it (its bill line is the item
description, or the room's name and number), and 1 of 55,760 legacy charges
has one. This app printed a room charge's note on the bill in place of "Room",
and showed a note in place of a missing item description.

**Shipped.** `0017_no_charge_notes.sql`: `v_transaction_lines` describes a line
by its item, or its charge type ("Room" for a room night), and no longer carries
`transnotes`; `post_charge`, `post_room_nights` and `sell_gift_certificate` take
no notes. The dialog's Notes box and the app's note parameters are gone. Every
bill and ledger line on file is unchanged, since no live line's description
came from a note. Criterion added to `post-room-night-and-extra-charges`.

**Kept:** the `transactions.transnotes` column, so the table still mirrors
Access for the lossless import. Nothing reads or writes it.

**To back out:** restore the three functions from `0015`/`0014`/`0005`, the view
from `0010`, and the dialog's Notes box from git history.
