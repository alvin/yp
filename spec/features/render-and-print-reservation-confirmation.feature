# id: xJrlmND0d7rWMY8ySsIi
@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:2 @printing @confirmation @documents
Feature: render and print reservation confirmation

  As Printing coordinator, Front-desk supervisor
  I want to render and print reservation confirmation
  So that reservation confirmations are produced in the established format

  Background:
    Given confirmations are queued for printing in the Print Center

  Scenario: Acceptance criteria
    Then The slip shows the guest name and reservation details needed to identify the booking.
    And The slip clearly shows that the reservation is confirmed.
    And The slip includes arrival and stay details relevant to the booking.
    And The slip can be printed for the guest or for office records.
