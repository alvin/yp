# id: tEMlOT3EI954rQEjI91A
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @search @departures @mode
Feature: support departure mode

  As Reservation clerk, Front-desk supervisor
  I want to support departure mode
  So that they can search for guests leaving on the chosen date

  Background:
    Given when the selected search mode is departures

  Scenario: Acceptance criteria
    Then The search returns stays that depart on the selected date.
    And The result list reflects the departures mode rather than another stay type.
    And Each returned row is identified as a departure match.
