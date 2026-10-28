@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @reservation @cancellation
Feature: un-cancel a reservation

  As Reservation clerk, Front-desk supervisor
  I want to un-cancel a reservation
  So that a guest who cancels and then comes after all keeps their booking, its number and its deposit

  Background:
    Given a reservation carries the red Cancelled badge

  Scenario: Acceptance criteria
    Then A cancelled reservation has Un-cancel where Cancel was.
    And Un-cancelling restores the booking as it was: the same number, dates, rooms and guests, back on the daily reports.
    And The cancellation date is cleared, so the stay leaves the cancellation report and has no cancellation notice.
    And The note typed when cancelling stays in the reservation notes for staff to edit; the confirmation of un-cancelling offers to open them.
    And A deposit refunded or kept on cancelling stays as recorded; one decided later is the stay's deposit again.
    And A reservation that is not cancelled cannot be un-cancelled.
