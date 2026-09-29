@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:5 @printing @cancellations @notices
Feature: print cancellation notices

  As Printing coordinator, Front-desk supervisor
  I want to print cancellation notices
  So that the lodge can issue the right paper notices for that day’s cancellations

  Background:
    Given the team needs notices for the reservations cancelled on a chosen day

  Scenario: Acceptance criteria
    Then Notices can be produced for a user-selected day.
    And Only reservations cancelled on that day are included.
    And The printed output is suitable for office use and filing.
    And The output is consistent with the lodge’s current cancellation notice process.
