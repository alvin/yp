# Changeset — the admin area (round 18)

**Date:** 2026-10-29
**Trigger:** Alvin, for the lodge: *"Need to build out a separate admin area (/admin)"*, in
lieu of Supabase or GUI backend access, with its own navigation bar, for the admin@ login
only, created in the seeds and set up locally and on staging once deployed. Three features:
(1) sales reporting from the Items Cashed Out family over a date range, choosing the product
codes ("all the different garments, without the hats"); (2) a Year end area, with the
existing future deposits list moved there and its date range specifiable; (3) input screens
for the five taxes (GST, PST, Liquor Tax, Room Tax, Destination Marketing Tax) and for every
item charged for (*"Room nights, beer, t-shirts, etc. with their 'product codes'"*), with
unit prices and taxes, adding new items and disabling old ones.

A first version edited the taxes and the price list in a spreadsheet grid (Tabulator), as the
request suggested. At review Alvin turned it down: *"pull out my idea of the spreadsheet
component. replace it with tables and a 'click a line to open a side drawer editing form'
ux ... consistent/shared with the front-desk"*; sold items disableable; Year end deposits
last on the nav; a way to add item types; tax rates as date ranges with their history,
*"something more clear that will make more sense to the admin user"*; and Sales as the full
report by default, with *"'all items' and 'selected'"* tabs in the top bar and a filter bar
of multi-select dropdowns. This changeset describes what ships. The grid and its package are
gone, and so are the first version's rule that a rate changes "from today" and its RPCs.

At the second review Alvin asked how a "room night" line mapped to rooms (it grouped rate
rows by code, and Add price inferred the rooms from the code, so his own try of R01 at $777
quietly ended the twelve cottages' rates), and then: *"rebuild room nights the way access
did"*, as top-level **Item prices** and **Rooms** tabs; the Sales filter's *"clear" and
"select all"* thought through; and, as a genuine gap, *"add a new rate code or give a
brand-new room its first rates ... The lodge needs to have this full feature set available,
in ways that maintain the compatible data model"*. §5 and §6 describe that rebuild. The
first by-code grouping (`room_night_periods` and its RPCs) is gone.

At the third review Alvin asked *"everything is editable?"*, and for *"help/instructions ...
behind an 'info' icon, in a slider drawer"* setting out the more involved edits step by step,
and for the headings *"'Sales Reports' ... 'Item Prices' and 'Rooms & Rates', Taxes, Year End
Deposits"*. §8 describes the help and the headings. Checking every field of Access's forms
against the drawers found one gap: the notes on items and on tax rates, now in their drawers
(§4, §5).

**State:** `npm run check` and `npm run build` clean; every feature test and
`business_logic_smoke.sql` passing; every migration, both seeds and the smoke test also run
on an empty PostgreSQL 17. `0033` and `seed_admin.sql` applied to the local stack, then to
the hosted project just before the push (30 October): `0033` in `begin … commit`, then
`staging/staging_hardening.sql` (its allowlist now names the admin login) and
`seed_admin.sql`. There, the admin login signs in and `is_admin()` is true for it alone.

---

## 1. The admin login and the area

**Shipped.**
- `supabase/seed_admin.sql` creates `admin@yellowpointlodge.com` in `auth.users` and
  `auth.identities`, confirmed, with the password Alvin gave stored as a bcrypt hash (cost 12).
  `config.toml` loads it after `seed.sql` on `supabase db reset`. It leaves an existing login
  alone and skips a PostgreSQL without the auth schema.
- `0033`: `is_admin()` is true for the admin login (by its email, any capitalisation), the
  service role, and a session that isn't an API request (SQL editor, psql, the import).
  `require_admin()` raises 42501 "Only the admin login can change the tax rates and the price
  list." The `*_staff_all` policies on `tax_rates`, `inventory_items`,
  `lookup_inventory_types`, `rooms`, `room_rates`, `lookup_room_rate_codes` and
  `lookup_room_types` become `*_staff_read` (select, everyone signed in) and `*_admin_write`
  (all, `is_admin()`).
- `/admin` has its own layout and navigation bar: Sales Reports, Item Prices, Rooms & Rates,
  Taxes, Year End Deposits, a Front desk button and sign out. Anyone but the admin login is sent to `/`.
  Signing in as the admin login lands on `/admin/sales`, and its front desk header gets an
  **Admin** button no other login sees.
- `staging/staging_hardening.sql`: the signup allowlist names the admin login.

**Judgement calls.**
- **admin@yellowpointlodge.com**, the front desk login's domain; the rule is that email.
- **The database enforces it,** not only the screen. *To back out:* restore the
  `*_staff_all` policies (`0004`'s form) and drop the `require_admin()` calls.
- **No password in the repository, which is public.** The seed holds the hash; the tests
  read `TEST_ADMIN_PASSWORD` from `app/.env` (gitignored).

## 2. Lists and the side drawer

**Shipped.**
- `ui/sheet/`: a drawer from the right, on the dialog's own primitive, reusing the
  dialog's title, description, header and footer.
- `app/form-sheet.svelte`: a form in the drawer, with the fields, **Cancel** and the save
  button as in every front desk dialog, Enter to save, and room at the footer's left for an
  action on the record (Disable item, Remove). A form opened from inside another (a room's
  rate) has a back link to it, in the same drawer.
- `admin/remove-rate-dialog.svelte`: removing a rate is confirmed as removing a charge is at
  the desk ("Remove this rate?", the line, **Keep it** / **Remove rate**), with the rate that
  runs on in its place.
- Every admin list is the front desk's `ui/table` with clickable lines and a chevron, as on
  the date search. The forms use the same `Label`, `Input`, `Combobox` and toasts as the
  front desk dialogs, and "Unit price" is the Add charge dialog's label.
- `ui/combobox` gains `multiple`: a tick box on each entry (ticked, partly ticked or empty),
  the list staying open while entries are ticked, **Select all** and **Clear** acting on what
  is listed (**Select all results** / **Clear results** once something is typed into the
  search, as Excel's filter does), the button summing up what is chosen, and option groups.
  One choice works exactly as before.

## 3. Sales: Items Cashed Out over a range

**Shipped.**
- `cashed_out_on(transdate, checkoutdate)`, the appendix's rule. `charges_cashed_out` reads
  it; the Daily Cash queries run in the same time.
- `report_items_sold(p_from, p_to, p_codes)`: the appendix's columns plus the cashed-out day
  and the item type, by code, then day, then reservation.
- `/admin/sales` is the report itself: From and To in its top bar (this month so far to
  start), landscape, every line dated, a subtotal per code. Tabs in the top bar: **All
  items** and **Selected**. Selected adds a bar with two multi-select dropdowns, **Item types**
  and **Items** (grouped by type), each entry with how many were sold. Ticking a type ticks all
  its items, which can then be cleared one by one; a type partly chosen has a partly ticked
  box and its button reads "Part of Shirts and Clothing". The buttons read a name, "All
  items" / "All types", "12 of 30 items" or "3 types"; **Clear** on the bar clears every item
  chosen. What is chosen is always among the items sold in the dates: new dates drop an item
  they didn't sell. The dates, the tab and the items chosen live in the address (`code=`
  repeated), so a reload or a print keeps them.
- `items-cashed-out-body.svelte`: the appendix's table, shared by the daily appendix and this
  report. The daily appendix's markup and strings are unchanged.
- **Found and fixed on the way:** the API returns at most 1,000 rows a request, and a summer
  runs to about 2,400 lines. The report had been silently cut short, so it is now read a page
  at a time.

**Judgement calls.**
- **The title stays "Items Cashed Out"**, as the lodge named the report.
- **A sale counts on the day it was cashed out** (the guest's check-out), as on the daily
  appendix. Access's ad-hoc `qryTransactionSearch` went by the day a charge was posted.
- **The meal codes (M01–M12) have no type in Access** and come under "Other".

## 4. Taxes: dated rates, as Access kept them

**What Access did.** `frmTaxRate` (`qryFormTaxRate`) listed every row of `tblTaxRate`, newest
start first: type, rate, start date, end date, notes, archive. A change, future or past, was a
row with its own dates: the GST holiday is a 0% row from 14 December 2024 to 15 February 2025,
between two 5% rows. Nothing in Access stopped two rows overlapping.

**Shipped.**
- `tax_rates_check` trigger: a live rate is 0 to under 1 and ends on or after it starts, and
  no two live rates of one type cover a day. A refusal names the rate in the way ("PST is
  already 7% from 01-Jul-10 to 31-Dec-29."), however the row is written. The existing rates
  never overlap.
- `save_tax_rate(id, type, rate, from, to, notes)`: adds or changes a rate. A new rate that starts
  while another runs, and runs at least as long, ends that one the day before: how a tax
  changes from a date. Any other overlap is refused. `remove_tax_rate(id)` archives a rate
  starting today or later, and the rate ending the day before it runs on to its end, so
  removing a rate entered by mistake undoes it. One that started before today can only be
  changed.
- `/admin/taxes`: every rate of the five taxes, grouped by tax, newest first, with Rate, From
  and To. The rate in force is marked **Current** and one to come **Upcoming**; past rates are
  greyed. A line opens its drawer (Rate, From, To, Notes; **Remove** from its start day on,
  after confirming).
  **Add rate** opens a drawer with Tax, Rate, From, To and Notes. To starts at the end of the rate
  it takes over from, and the drawer says what saving will do: "The 7% rate from 01-Jul-10
  ends on 31-Mar-27."

**Judgement calls.**
- **Overlaps are refused, not resolved.** Only the common case (a new rate from a date on)
  closes the running rate. A temporary rate inside a longer one, like the GST holiday, is
  entered as Access's was: end the running rate, add the temporary one, add the rate that
  resumes. *To back out:* drop the trigger.
- **HST and Hotel tax stay off the screen** (both 0% today). During the GST holiday
  (GST 0%), Access charged room nights HST at 3% (925 room lines); a repeat would need HST
  shown. *To back out:* add them to `TAXES` in `$lib/admin.ts`.
- **Past rates stay editable,** as in Access; a rate can be removed up to the day it starts.
  A rate in force since an earlier day may already have taxed charges whose later edits read
  it, so it is ended or changed instead.

## 5. Item prices: Items and Item types

**Shipped.**
- `/admin/item-prices`, two tabs (kept in the address as `?tab=`).
- **Items**: code, description, type, unit price, taxes (GST · PST · Liquor · Room · DMT),
  in code order. A search narrows it; **Show disabled** adds the disabled items, marked
  Disabled. The drawer has Code, Description, Type, Unit price, the five tax boxes and Notes
  (`invnotes`: 102 of the 245 items carry the lodge's notes), with **Disable item** /
  **Enable item** at its left, for any item, sold or not.
  `save_inventory_item` refuses a code an active item already has (case-insensitive) when an
  item is added, recoded or enabled.
- **Item types**: each type, its **daily cash line** and how many active items it has.
  **Add item type** asks for the name and the line; a type's line can be changed. 0033 adds
  `lookup_inventory_types.transactiontype`. `charge_category` reads it first and falls back,
  for Access's types, to the lines it always gave (Red Wine → Liquor). `save_item_type`
  refuses Room as a line.

**Judgement calls.**
- **An item type carries its daily cash line.** Here a type decides which line of the Daily
  Cash report an item's charges post to (`charge_category`), and an unknown type posts to
  Misc. A new type without a line would quietly move its items' sales to Misc. Access never
  had the question: the clerk picked each charge's type.
- **Disabled, not deleted.** Clearing Active sets `invarchive`: the item leaves the front
  desk's charge picker (on its next load) and old charges still name it.
- **Inactive items are hidden until asked for**, since 97 of the 245 are disabled.
- **Editing an item trims its code.** Four Access codes carry a trailing space (`L09 `,
  `L13 `, `L26 `, `L27 `); the first edit to any of them saves it without.
- **Item prices aren't dated** (Access kept one price per item); a change applies from the
  next charge.

## 6. Rooms, as Access's Room form and lookup tables kept them

**What Access did.** The admin menu's **Room Form** (`frmRoom`, "Room/Rates") showed one room
at a time: Room Name, Room #, Room Type (from `tblLookupRoomType`), Room Code, Room
Shorthand, Sort order (`RoomOrder`, a decimal), Archive?, Room Notes, and GST, PST, HST,
Room Tax, D. Mktg Tax and Other Tax, over a subform of that room's own rate rows
(`qrySubformRoomRate`: start, end, rate type, code, rate, notes, archive), newest first.
Nothing tied rooms to a code: each rate row carried one. **Maintain Lookup Tables** edited
any `tblLookup…` table, room rate codes and room types among them. **Append Room Rates**
bulk-loaded a season's rates, one row per room, from an Excel sheet (`tblRoomRateEXCEL`),
as in 2010. Since 2016 the lodge has typed each year's price over the same row: Eve's Double
row still reads 02-Jan-16 to 02-Jan-29 while its nights were charged $276 in 2022 and $337
in 2026.

**Shipped.**
- `/admin/rooms` (**Rooms & Rates**), three tabs: **Rooms**, **Rate codes**, **Room types**.
- **Rooms**: every active room in sort order: room, type, shorthand, the Double, Single and
  Split rates in force today, taxes, sort order; **Show disabled** adds the rest. A room
  opens in a wider drawer with Room name, Room #, Room type, Sort order, Room code, Room
  shorthand, Room notes and the GST, PST, Room Tax and DMT boxes (Access's labels), and
  below them the room's own rates (rate, code, price, From, To, Current/Upcoming), each rate
  type's newest first. A rate opens in the same drawer, with a back link to the room: Rate
  (Double/Single/Split), Rate code, Price per night, From, To, Notes. **Add rate** on a room
  pre-fills its latest code for that rate and the running rate's end date. **Disable room** /
  **Enable room** at the footer's left.
- **Add room** (`save_room`): the drawer stays on the new room after **Add room**, for its
  first rates. Name required; two rooms can't share a name and number, or a sort order (the
  next whole number to start; a decimal places a room between two others, as Access's
  Single did). The type must be a room type. A new room's HST and Other Tax flags are off.
- **Add rate** on the list (`save_room_rate` with several rooms): the rate's code, type,
  rooms, price, dates and notes. The rooms are chosen by name in the multi-select (grouped by
  room type, each with its current price for the chosen rate) and named under the field.
  Picking a code ticks the rooms charged at it now and the rate they are at, until either is
  changed by hand. Each room's rate of that type running when it starts, and ending no later
  than it does, ends the day before; the drawer says so ("The running Double rate of 12 rooms
  ends on 31-Dec-26."). `room_rates_check` refuses an overlap per room, naming the rate in
  the way.
- **Remove** (`remove_room_rate`), on a rate starting today or later: after confirming, the
  rate is archived and the room's rate of that type ending the day before runs on to its
  end, as for taxes. The confirmation names it.
- **Rate codes** (`rate_codes`, `save_rate_code`): each code, its description and how many
  active rooms have a rate at it today or later; **Add rate code**; a code's description can
  be changed.
- **Room types** (`room_types`, `add_room_type`): each type and its active rooms; **Add room
  type**.
- The data format is Access's: one `rooms` row per room, one `room_rates` row per room, rate
  type and stretch of days, codes and types as lookup rows.

**Judgement calls.**
- **Per room, as Access did,** with bulk entry for the yearly change (Access's Append Room
  Rates) instead of a price per code. Picking a code to fill in the rooms is a shortcut the
  drawer shows openly; the rooms list is always the one saved.
- **The four taxes on a room are the lodge's own** (GST, PST, Room Tax, DMT). Access's form
  also showed HST and Other (Hotel) Tax, both at 0% and off the Taxes screen; they stay as
  stored.
- **Codes and types are added, and a code's description changed, but neither is renamed or
  deleted.** The rate rows carry the code and the rooms carry the type as text, so a rename or
  a delete would leave them naming nothing. The lodge's own practice was to relabel: R72
  reads "Not in use".
- **The three rate types aren't editable.** The desk's charge dialog offers exactly Double,
  Single and Split.
- **Disabling a room leaves its stays alone.** It leaves the desk's room lists (on the desk's
  next load) and stays booked in it keep it, as Access's Archive did.
- **A rate on several rooms is removed room by room.** Nothing in the rows records that they
  were entered together.

**Access's admin menu, item by item.** Room Form → Rooms; Inventory Form → Item prices ›
Items; Tax Rate Form → Taxes; Maintain Lookup Tables → Item types, Rate codes and Room types
(the other lookups, such as cities, diets and payment types, weren't asked for); Append Room
Rates → Add rate on several rooms. The Exchange Rate Form isn't carried: the desk takes
Canadian funds only. Nor is Archive (moving old reservations to a second database).

## 7. Year end deposits

**Shipped.** `report_next_years_deposits(p_from, p_to)` replaces the `p_year` version:
deposits received between the two dates for stays arriving after the To date. The report
moved from `/reports/next-years-deposits` to `/admin/year-end-deposits`, last on the admin
navigation bar, with From and To in its top bar, January 1 to December 31 of this year to
start. The Print Center's Year end card is gone. A calendar year prints exactly as before.

**Judgement call — "the upcoming year" is the year now ending** (deposits received in 2026).
*To back out:* `${Number(year) + 1}` in the route's default.

## 8. Help, and the headings

**Shipped.**
- `app/help-sheet.svelte`: an info button (**Help**) beside each admin page's heading, or in
  the top bar of the two reports, opens that page's instructions in a drawer from the right
  (the same `ui/sheet`). Each task is a heading over numbered steps, with every button, tab and
  field named in bold as the screen shows it. A page with more than three tasks lists them
  first, each a link to its steps.
- `$lib/admin-help.ts` holds the text, page by page: the tasks that take more than a click,
  such as setting next season's prices for a group of rooms, entering a tax holiday, undoing a
  rate entered by mistake, or counting a kind of item while leaving some out; and, where it
  matters, how the page's rules work (how dated rates take over from each other, what the
  sales report counts).
- The navigation bar reads **Sales Reports**, **Item Prices**, **Rooms & Rates**, **Taxes**,
  **Year End Deposits**, in that order. The three editing pages' headings and browser titles
  match it. The addresses are unchanged.
- `save_inventory_item` and `save_tax_rate` take the notes (`p_notes`): left out, the notes
  stay as they are; blank, they are cleared.

**Judgement calls.**
- **The help is held to the screens.** The story's test checks that every name in bold still
  appears on the admin screens, so renaming a button fails the build until the help says so.
  *To back out:* take `<HelpSheet>` off the five pages and delete `help-sheet.svelte` and
  `admin-help.ts`.
- **The two reports keep their printed titles,** Items Cashed Out and Next Year's Deposits, as
  the reports always read; the bar names them Sales Reports and Year End Deposits.
- **Help for tasks, not fields.** The screens' own labels and lines are unchanged; the help
  walks through what spans several of them.
- **Notes are plain text,** as elsewhere: the full import converts Access's rich text
  (`normalize_stored_notes`). A database built from `seed.sql` alone (`supabase db reset`)
  isn't converted, so its item notes and one tax note show Access's `<div>` tags.

**Everything editable, measured against Access's admin menu.** Every field of the Room Form,
its rate subform, the Inventory Form and the Tax Rate Form is in a drawer, except HST and
Other (Hotel) Tax (§4). By design, rate codes and room types are added (and a code's
description changed) but not renamed or deleted (§6), items and rooms are disabled rather than
deleted, the three rate types, the list of taxes and the Daily Cash report's lines are fixed,
and a rate that started before today is changed, not removed. Of the other lookup tables, the
desk uses four (salutations, phone types, payment types, payment categories), and none of them
is in the admin area; payment types and categories also drive the payment rules. The rest
(cities, regions, countries, diets, shuttle sites, users, payment and inventory codes) stay in
the Access file, since nothing in the new system reads them
(`2026-10-29-access-tables-in-use.md`).

## 9. Tests and checks

- Stories: `restrict-the-admin-area-to-the-admin-login`, `report-items-sold-over-a-date-range`,
  `set-the-tax-rates`, `maintain-item-prices` (once `maintain-the-price-list`),
  `maintain-the-rooms`, `find-step-by-step-help-in-the-admin-area`, and
  `print-next-years-deposits` rewritten. One test each.
- The tests enter tax rates and room rates only from the year 2900 on, and items, item types,
  rooms, rate codes and room types named `ZZ…` (test rooms disabled, out of the desk's lists,
  except while the screen adds one), so nothing else is charged at them. Global setup clears
  them. `show-room-availability-during-booking` leaves `ZZ…` rooms out of its comparison of
  the whole room list.
- `business_logic_smoke.sql` exercises the date rules for taxes and room rates on today's
  real rates, the restore on removing, a room added and disabled, a room's taxes and the
  code rule, all rolled back.
- **A flake, explained:** running `npm run check` while the dev server is up regenerates
  SvelteKit's files, and Vite reloads every open page. A full run started at that moment lost
  one test's drawer to the reload. Leave a moment between the two, or stop the dev server.
