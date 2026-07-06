# id: xJrlmND0d7rWMY8ySsIi
@status:done @priority:2 @printing @confirmation @documents
Feature: render and print reservation confirmation

  As a user
  I want to render and print reservation confirmation
  So that so that reservation confirmations are produced in the established format

  Background:
    Given when confirmations are queued from guest document printing

  Scenario: Acceptance criteria
    Then The slip shows the guest name and reservation details needed to identify the booking.
    And The slip clearly shows that the reservation is confirmed.
    And The slip includes arrival and stay details relevant to the booking.
    And The slip can be printed for the guest or for office records.
