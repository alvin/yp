@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:2 @printing @check-in @arrival-list
Feature: print check-in folios for a selected day

  As Printing coordinator, Front-desk supervisor
  I want to print check-in folios for a selected day
  So that front desk has folios ready for check-in

  Background:
    Given the printing coordinator runs guest documents for arrivals

  Scenario: Acceptance criteria
    Then The folios for a chosen day are the stays arriving that day, and no others; a cancelled stay has none.
    And Tomorrow's folios are one click away in the Print Center, as are any other day's.
    And Each folio prints the guest, the reservation number, the arrival and departure dates, and the room with its dates and party size.
