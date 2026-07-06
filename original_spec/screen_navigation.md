# Screen Navigation and Traceability

This document shows how the screens, report groups, and feature files fit together.

## Primary navigation flow

```mermaid
flowchart TD
  Lookup[Lookup Screen]
  NameResults[Name Search Results]
  DateResults[Date Search Results]
  Transaction[Transaction Screen]
  Print[Print Screen]
  DCAR[Daily Cash Activity Report]
  GuestNotes[Guest Notes\n(screen-only)]
  GuestDocs[Guest documents\nConfirmation / Check-in Folio / Check-out Bill / Cancellation]
  OpsReports[Operational reports\nKitchen / Housekeeping / In House / Manual Sales List]
  DCARDetail[DCAR appendix reports\nDeposits Received / Deposits Applied / Cashier Detail / Items Cashed Out]

  Lookup -->|Search by name| NameResults
  Lookup -->|Search by reservation number| Transaction
  Lookup -->|Search by date or date range| DateResults
  Lookup -->|New Reservation| Transaction
  Lookup -->|Print Menu| Print
  Lookup -->|Daily Cash Report| DCAR
  Lookup -->|All-fields query| Lookup

  NameResults -->|Select reservation| Transaction
  DateResults -->|Select reservation| Transaction
  NameResults -->|Guest Notes| GuestNotes
  Transaction -->|Guest Notes| GuestNotes

  Transaction -->|Reservation notes feed reports| OpsReports
  Transaction -->|Reservation printing| GuestDocs
  Transaction -->|Transactions feed daily cash reporting| DCAR
  DCAR --> DCARDetail

  Print -->|Daily report actions| OpsReports
  Print -->|Guest-document actions| GuestDocs
  Print -->|Batch print for tomorrow| OpsReports
  Print -->|Batch print for tomorrow| GuestDocs
```

## Screen map

| Screen | Wireframe | Feature |
|---|---|---|
| Lookup Screen | [Lookup Screen](wireframes/html/lookup_screen.html) | [Lookup Screen feature](../features/lookup_screen.feature) |
| Name Search Results | [Name Search Results](wireframes/html/name_search_results.html) | [Name Search Results feature](../features/name_search_results.feature) |
| Date Search Results | [Date Search Results](wireframes/html/date_search_results.html) | [Date Search Results feature](../features/date_search_results.feature) |
| Transaction Screen | [Transaction Screen](wireframes/html/transaction_screen.html) | [Transaction Screen feature](../features/transaction_screen.feature) |
| Print Screen | [Print Screen](wireframes/html/print_screen.html) | [Print Screen feature](../features/print_screen.feature) |

## Reporting feature pack

| Coverage area | Feature |
|---|---|
| Guest documents and operational report fidelity | [Printed Outputs feature](../features/printed_outputs.feature) |
| Daily Cash Activity Report and appendix workflow | [Daily Cash Reporting feature](../features/daily_cash_reporting.feature) |

## Report map

### Guest documents

- [Reservation Confirmation Slip](reports/reservation_confirmation.html)
- [Check-in Folio](reports/check_in_folio.html)
- [Check-out Bill / Guest Invoice](reports/checkout_bill.html)
- [Cancellation Notice](reports/cancellation_notice.html)

### Operational reports

- [Housekeeping Report](reports/housekeeping_report.html)
- [In House Report](reports/in_house_report.html)
- [Kitchen / Meal Report](reports/kitchen_meal_report.html)
- [Kitchen Report (single / filtered)](reports/kitchen_report_single.html)
- [Manual Sales List](reports/manual_sales_list.html)

### Daily cash reporting

- [Notes on Daily Cash Activity Report](reports/daily_cash_activity_notes.html)
- [Daily Cash Activity Report](reports/daily_cash_activity_report.html)
- [Deposits Received](reports/deposits_received.html)
- [Deposits Applied](reports/deposits_applied.html)
- [Cashier Detail](reports/cashier_detail.html)
- [Items Cashed Out](reports/items_cashed_out.html)

## Screen-to-report traceability

| Screen | Report relationships |
|---|---|
| [Lookup Screen](wireframes/html/lookup_screen.html) | Direct access to [Daily cash reporting](reports/index.html#daily-cash-reporting) and to the [Print Screen](wireframes/html/print_screen.html). |
| [Name Search Results](wireframes/html/name_search_results.html) | Guest Notes exist here but do not print to reports. |
| [Date Search Results](wireframes/html/date_search_results.html) | Opens reservations that can be printed as [guest documents](reports/index.html#guest-documents) or included in [daily cash reporting](reports/index.html#daily-cash-reporting) from the [Transaction Screen](wireframes/html/transaction_screen.html). |
| [Transaction Screen](wireframes/html/transaction_screen.html) | Feeds [guest documents](reports/index.html#guest-documents), [operational reports](reports/index.html#operations-reports), and [daily cash reporting](reports/index.html#daily-cash-reporting). |
| [Print Screen](wireframes/html/print_screen.html) | Batch or individual printing for [guest documents](reports/index.html#guest-documents) and [operational reports](reports/index.html#operations-reports). |

## Scope questions

Unresolved scope questions are tracked next to the related feature files:

- [Lookup Screen questions](../features/lookup_screen.questions)
- [Name Search Results questions](../features/name_search_results.questions)
- [Date Search Results questions](../features/date_search_results.questions)
- [Transaction Screen questions](../features/transaction_screen.questions)
- [Print Screen questions](../features/print_screen.questions)
- [Printed Outputs questions](../features/printed_outputs.questions)
- [Daily Cash Reporting questions](../features/daily_cash_reporting.questions)
