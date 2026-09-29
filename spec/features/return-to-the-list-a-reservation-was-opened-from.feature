@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:3 @navigation @lookup
Feature: return to the list a reservation was opened from

  As Reservation clerk, Front-desk supervisor
  I want the reservation screen's back button to return to the list I opened it from
  So that checking several of one guest's stays doesn't mean looking the guest up again each time

  Background:
    Given staff open a reservation from a list of reservations

  Scenario: Acceptance criteria
    Then Opened from a guest's reservations, the back button returns to that guest's reservations.
    And Opened from a date search or an all-fields search, the back button returns to those results.
    And Opened any other way, the back button goes to Lookup as before.
