# id: OZTxzbkYTXJhA4KXQ2D5
@status:done @priority:5 @printing @billing @departures
Feature: print check-out bills queue

  As a user
  I want to print check-out bills queue
  So that they can produce the bills needed for guests leaving that day in a single run

  Background:
    Given when staff choose a departure date from the print menu

  Scenario: Acceptance criteria
    Then Staff can select one departure date to build the print run.
    And The system lists the guests due to depart on that date who need a bill.
    And Staff can print the selected bills together from the same screen.
    And The print run is clearly tied to the chosen departure date.
