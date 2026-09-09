# id: r15wIqrrSKEN08VVmQKV
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @lookup @search @broad
Feature: run all-fields search

  As Reservation clerk, Front-desk supervisor
  I want to run all-fields search
  So that they can find a guest or reservation even when the exact field is unknown

  Background:
    Given staff search using broader details entered on the lookup home screen

  Scenario: Acceptance criteria
    Then The lookup home screen supports a broad search across office-entered details.
    And A search returns matches from relevant details beyond name or reservation number.
    And Staff can open a matching result from the broad search results.
    And Several keywords can be entered at once, and only records carrying all of them are returned.
    And A keyword may land in a different field from the others — a name and a city together still match one record.
    And Each matching record comes back once, naming the fields the keywords matched.
