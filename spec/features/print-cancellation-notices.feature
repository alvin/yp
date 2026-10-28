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
    And The Cancellation report lists the stays cancelled across a chosen range of days, not one day, by the day each was cancelled, with the reservation's notes, where the note typed when cancelling goes.
    And The note typed when cancelling prints on the Cancellation report only, never on the notice, which goes to the guest.
