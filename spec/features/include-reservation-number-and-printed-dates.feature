# id: 8WVaveRfMhaTc9Cx0jSg
@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:5 @confirmation-slip @traceability @printout
Feature: include reservation number and printed dates

  As Printing coordinator, Front-desk supervisor
  I want to include reservation number and printed dates
  So that they can identify the reservation and see when the slip was produced

  Background:
    Given when staff print a reservation confirmation slip for a reservation made or confirmed on a given day

  Scenario: Acceptance criteria
    Then The slip shows the reservation number clearly.
    And The slip shows the date the reservation was made or confirmed.
    And The slip shows the date the slip was printed.
    And The printed date information is easy for staff to read on the slip.
