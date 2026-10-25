@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:5 @printing @billing @departures
Feature: print check-out bills queue

  As Printing coordinator, Front-desk supervisor
  I want to print check-out bills queue
  So that they can produce the bills needed for guests leaving that day in a single run

  Background:
    Given staff choose a departure date in the Print Center

  Scenario: Acceptance criteria
    Then The bills for a chosen date are the stays departing that day, and no others; a cancelled stay has none.
    And The day's bills print together, in the batch's Check-out bills group for that date.
    And Each bill carries the stay's reservation number and its balance owing.
