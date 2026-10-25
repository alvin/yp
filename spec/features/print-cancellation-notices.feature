@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:5 @printing @cancellations @notices
Feature: print cancellation notices

  As Printing coordinator, Front-desk supervisor
  I want to print cancellation notices
  So that the lodge can issue the right paper notices for that day’s cancellations

  Background:
    Given the team needs notices for the reservations cancelled on a chosen day

  Scenario: Acceptance criteria
    Then The notices for a chosen day are the reservations cancelled that day, and no others.
    And Each notice carries the cancellation date, the deposit received and what became of it.
    And The day's cancellations also list on the Cancellation report.
