# id: dXlzHTjm8ZssgXaNDlxV
@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:2 @printing @check-in @arrival-list
Feature: print check-in folios for a selected day

  As Printing coordinator, Front-desk supervisor
  I want to print check-in folios for a selected day
  So that so that front desk has folios ready for check-in

  Background:
    Given when the printing coordinator runs guest documents for arrivals

  Scenario: Acceptance criteria
    Then The printout includes all arrivals for the selected day.
    And Staff can generate the printout for tomorrow as well as any other chosen day.
    And The folio output is ready for the existing print workflow to process.
    And The output is suitable for front-desk use without extra manual reformatting.
