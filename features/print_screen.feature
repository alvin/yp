Feature: Print Screen
  The print screen groups daily reports and guest documents so staff can run
  tomorrow's batch work or produce individual copies by date or reservation from
  the production schema.

  Background:
    Given printable data is stored in `ypl` tables that preserve the Access data
    And guest-document queues are exposed through `ypl.report_guest_document_queue`
    And operations reports are exposed through `ypl.report_housekeeping`, `ypl.report_in_house`, `ypl.report_kitchen_meal`, `ypl.report_manual_sales`, and `ypl.report_cancellation_list`

  Scenario: View the print screen with the current report and document menu
    Given the print screen is opened
    When the print menu is shown
    Then the user sees Kitchen Report, Housekeeping Report, In-House List, Liquor / Charge List, and Cancellation Report actions
    And the user sees Confirmations, Check-in Folios, and Check out Folio / Bill actions
    And the user-facing labels follow the current lodge report names for staff continuity
    And the source Access report names remain traceable through `ypl.application_objects`

  Scenario: Batch print tomorrow's daily reports
    Given the print screen is opened
    When the user selects Print All Reports for Tomorrow
    Then tomorrow's daily reports can be produced together
    And the reports use `ypl.reservations`, `ypl.reservation_guests`, `ypl.room_assignments`, `ypl.housekeeping_notes`, `ypl.kitchen_meals`, `ypl.transactions`, and `ypl.payments` as required

  Scenario: Batch print tomorrow's guest documents
    Given the print screen is opened
    When the user selects Print All Folios For Tomorrow
    Then tomorrow's guest documents can be produced together
    And check-in folios are queued by `ypl.reservations.resarrivaldate`
    And checkout bills are queued by `ypl.reservations.resdeparturedate`

  Scenario: Print a selected daily operations report for a chosen date
    Given the print screen is opened
    When the user chooses a daily report and a selected date
    Then that report can be produced for the chosen date
    And the selected date is passed to the matching `ypl` report RPC

  Scenario: Print a selected report filtered by a date range
    Given the print screen is opened
    When the user chooses a report and an explicit date range
    Then that report can be produced for the selected date range where the Access report supports it

  Scenario: Print confirmation slips for reservations made today
    Given the print screen is opened
    When the user prints confirmations
    Then confirmation slips can be produced for reservations booked or confirmed that day
    And the queue uses `ypl.reservations.resbookingdate` and `ypl.reservations.resdateconfirmed`

  Scenario: Reprint an individual guest document by reservation, guest, or date
    Given the print screen is opened
    When the user prints an individual guest document
    Then a single copy can be produced by reservation, guest, or date selection
    And reservation-number selection uses `ypl.reservations.resnumber`

  Scenario: Offer batch and individual paths for guest-document printing
    Given the print screen is opened
    When the user selects a guest-document action that supports more than one print path
    Then the workflow can offer a batch-print option
    And the workflow can offer an individual-selection option

  Scenario: Build guest-document queues for the selected print date
    Given the print screen is opened
    When the user chooses confirmations, check-in folios, checkout bills, or cancellation notices for a selected day
    Then confirmations can be queued for reservations made or confirmed on that day
    And check-in folios can be queued for arrivals on that day
    And checkout bills can be queued for departures on that day
    And cancellation notices can be queued for reservations cancelled on that day
    And those queues are generated through `ypl.report_guest_document_queue`

  Scenario: Keep daily report printing tied to the existing report set
    Given the print screen is opened
    When the user reviews the daily report actions
    Then the kitchen report and filtered kitchen report remain available for date or date-range printing
    And the housekeeping report, in-house list, manual sales / liquor-charge list, and cancellation report remain visible as lodge report actions
