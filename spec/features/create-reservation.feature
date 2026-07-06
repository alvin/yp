# id: ZQ5bXJ4YpjZA6MKn1fri
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @reservation @stay @booking
Feature: create reservation

  As Reservation clerk, Front-desk supervisor
  I want to create reservation
  So that the stay can be prepared as a reservation record for the lodge

  Background:
    Given working in the reservation workspace and entering the basic details for a new stay

  Scenario: Acceptance criteria
    Then The clerk can begin a new reservation from the transaction screen.
    And The reservation captures the stay details needed to hold the booking.
    And The reservation can be associated with the correct guest and dates.
    And The user can review the reservation before moving on to other actions.
