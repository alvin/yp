# Yellow Point Lodge Front Desk System Requirements

## Purpose

This scope defines a front desk system for Yellow Point Lodge based on the lodge's existing MS Access workflow and current printed report set.

The goal is **not** to replace the lodge's operational style with a generic hotel platform. The goal is to simplify the guest/reservation workflow while keeping the printed outputs, accounting visibility, and day-to-day operating habits close to what already works.

## Project principles that shape the scope

- Keep the interface simple.
- Avoid unnecessary HMS-style complexity such as cloud dependence, subscriptions, yield-management logic, calendar/email/marketing functions, or analytical extras outside the front desk workflow.
- Preserve the current printed reports and folios as closely as practical.
- Simplify how staff interact with guest records and reservation records.
- Keep the Daily Cash Activity Report (DCAR) and its supporting detail visible and traceable.
- Preserve the manual reconciliation workflow rather than assuming a fully automated accounting flow.

## Business context

- Yellow Point Lodge is a 61-room all-inclusive rustic resort on Vancouver Island.
- The lodge reports about 18K room nights per year.
- The current system is problematic because of:
  - transaction complexity around deposits and prepayments
  - redundant date entry
  - user unfriendliness / learning curve
  - increasing instability

## Core reservation scope

The system needs to store reservation information including:

- guest name
- guest contact information
- dietary requirements
- deposit paid
- individual room assignment (not just a room type)
- check-in and check-out dates
- other reservation detail already present in the current office workflow

### Reservation horizon

- Reservations are stored only **one year in advance**, per the reservation policy.

## Core operational workflow

### 1. Lookup / entry workflow

The home screen is the lookup screen.

It needs to support:

- search by guest name
- search by reservation number
- search by date
- new reservation
- print menu access
- Daily Cash Activity Report access
- a broader all-fields query path for cases where staff may only have a phone number, address fragment, or similar data
- date-range access in addition to single-day date search

### 2. Guest-history workflow

When a guest record is found by name, staff need to see:

- guest profile / contact information
- past reservations
- current / in-house reservation context
- future reservations
- guest notes that belong to the guest rather than a single stay

Important workflow note:

- **Guest notes are office-facing and should not print to reports.**

### 3. Reservation / transaction workflow

When a reservation is opened, staff need to work from a main transaction screen that includes:

- guest information
- reservation information for that stay
- room and date detail
- room moves during a stay
- reservation notes that feed reports
- deposits
- payments
- room-night charges and extras
- print actions for the current reservation
- re-book and cancel actions

Important transaction conventions:

- deposits and payments are treated as **negative** transaction lines
- charges are treated as **positive** transaction lines
- prices may be manually overridden
- dates and type/coding detail will likely be needed so transactions can feed downstream reports

Important reservation complexity explicitly in scope:

- multiple guest names on a reservation
- shared-room / couple handling
- one-bill arrangements
- split-bill needs
- room moves during a stay
- deposit refund / deposit transfer handling on cancellation or re-booking

## Screen-by-screen scope

### [Lookup Screen](wireframes/html/lookup_screen.html)

The lookup screen needs to support:

- guest name search with narrowing results as more characters are entered
- partial-string matching in names
- reservation-number lookup
- date lookup
- date-range lookup
- all-fields query lookup
- direct access to a blank transaction screen for a new reservation
- direct access to the print screen
- direct access to the DCAR

### [Name Search Results](wireframes/html/name_search_results.html)

The name-search return screen needs to show:

- guest information
- reservation history for that guest
- a guest-notes button
- reservation selection leading to the transaction screen

Unresolved presentation questions for this screen are tracked in [`name_search_results.questions`](../features/name_search_results.questions).

### [Date Search Results](wireframes/html/date_search_results.html)

The wireframe note describes:

- a simple alphabetical list of guests arriving on the selected date

Unresolved date-search matching questions are tracked in [`date_search_results.questions`](../features/date_search_results.questions).

### [Transaction Screen](wireframes/html/transaction_screen.html)

The transaction screen is the main reservation screen and must support:

- guest information
- reservation information
- room moves with move dates
- report-feeding notes for kitchen / housekeeping / requests
- transaction ledger for deposits, payments, room nights, liquor, sundries, extras, and similar lines
- re-book action
- cancel action
- print confirmation / folio / bill / cancellation outputs

The workflow also needs:

- room-selection help that can include brief bed-layout description
- the transaction side kept as simple as possible while still feeding the DCAR
- this screen to remain tightly tied to the DCAR design work

### [Print Screen](wireframes/html/print_screen.html)

The print screen groups:

- daily reports
- folios / guest-facing forms

It supports two modes:

- batch printing for **tomorrow**
- individual printing by date and/or guest/reservation selection

The print workflow includes:

- standard 8.5 x 11 reports
- smaller A2-style folio/confirmation outputs
- possible selection prompts for individual confirmation / cancellation / bill reprints

## Printed outputs in scope

### Guest-facing slips and folios

- [Reservation Confirmation Slip](reports/reservation_confirmation.html)
- [Check-in Folio](reports/check_in_folio.html)
- [Check-out Bill / Guest Invoice](reports/checkout_bill.html)
- [Cancellation Notice](reports/cancellation_notice.html)

### Daily operations reports

- [Housekeeping Report](reports/housekeeping_report.html)
- [In House Report](reports/in_house_report.html)
- [Kitchen / Meal Report](reports/kitchen_meal_report.html)
- [Kitchen Report (single / filtered)](reports/kitchen_report_single.html)
- [Manual Sales List](reports/manual_sales_list.html) / Liquor-Charge-style list

### Daily cash reporting

- [Daily Cash Activity Report](reports/daily_cash_activity_report.html) (DCAR)
- [Notes on Daily Cash Activity Report](reports/daily_cash_activity_notes.html)
- [Deposits Received](reports/deposits_received.html)
- [Deposits Applied](reports/deposits_applied.html)
- [Cashier Detail](reports/cashier_detail.html)
- [Items Cashed Out](reports/items_cashed_out.html)

## Report-specific scope notes

### Confirmation / folio / bill / cancellation outputs

The sample outputs confirm that the system must preserve printed structures such as:

- guest/contact blocks
- reservation number and printed dates
- arrival / departure / room / guest count detail
- deposit lines
- signature and vehicle fields where applicable
- itemized charges and tax lines where applicable
- printed reservation notes where applicable

### [Housekeeping Report](reports/housekeeping_report.html)

The sample confirms the need to carry:

- room status context such as Arrive Today, Depart Today, In House, Move In
- housekeeping notes tied to the reservation
- note dates where shown on the current report

### [In House Report](reports/in_house_report.html)

The sample confirms the need to carry:

- Arrive Today / Depart Today / In House grouping
- section counts and total guests
- reservation-specific occupancy notes
- multi-room or repeated-row reservation handling where one reservation spans more than one occupancy line

### [Kitchen reporting](reports/kitchen_meal_report.html)

The sample confirms the need to carry:

- dietary restrictions
- allergy detail
- meal preferences
- guest-specific wording inside multi-name reservations

These notes should remain close to the wording staff already use.

## [Daily Cash Activity Report](reports/daily_cash_activity_report.html) (DCAR) scope notes

The DCAR is the day's "till tape" and remains a major scope area.

The daily cash flow needs to preserve these points:

- the DCAR has two balancing sections
- the top section captures revenue, taxes, and balance-sheet-style adjustments
- the lower section captures payments received by type
- supporting appendix reports provide the detailed breakdown behind the DCAR
- manual adjustments are part of the intended workflow
- weekly spreadsheet entry remains a deliberate manual control point

## Scope questions

Unresolved scope questions are tracked next to the related feature files:

- [`lookup_screen.questions`](../features/lookup_screen.questions)
- [`name_search_results.questions`](../features/name_search_results.questions)
- [`date_search_results.questions`](../features/date_search_results.questions)
- [`transaction_screen.questions`](../features/transaction_screen.questions)
- [`print_screen.questions`](../features/print_screen.questions)
- [`printed_outputs.questions`](../features/printed_outputs.questions)
- [`daily_cash_reporting.questions`](../features/daily_cash_reporting.questions)

## Scope-aligned requirement checklist

| ID | Requirement |
|---|---|
| FR-001 | Store reservation information including guest name/contact, dietary requirements, deposit paid, individual room, and check-in/check-out dates. |
| FR-002 | Store reservations only one year in advance. |
| FR-003 | Print check-in folios for guests arriving the following day. |
| FR-004 | Print department reports for guests arriving the following day. |
| FR-005 | Print confirmation slips for reservations made that day. |
| FR-006 | Add charges including room nights and extras to each guest record during the stay. |
| FR-007 | Print bills based on the check-out day. |
| FR-008 | Summarize transaction information in a daily cash report. |
| UI-001 | Home screen includes a New Reservation action. |
| UI-002 | Home screen supports name and date searching. |
| UI-003 | Date-based search returns matching reservation records. |
| UI-004 | Name search narrows based on entered characters and supports partial matching. |
| UI-005 | Guest selection shows guest information plus reservation history. |
| UI-006 | Reservation history needs past and future coverage, with in-house/present handling also shown in the screen flow. |
| UI-007 | Reservation selection leads to the full reservation/transaction workflow. |
| OPS-001 | Guest notes are screen-only and do not print. |
| OPS-002 | Room moves, multiple guest names, and split-bill needs are in scope. |
| OPS-003 | Transaction entries need enough date/type detail to feed reports, especially the DCAR. |
| RPT-001 | Reports and folios should stay as close as possible to the existing printed versions. |
| RPT-002 | DCAR detail reports remain part of scope rather than being collapsed away. |
