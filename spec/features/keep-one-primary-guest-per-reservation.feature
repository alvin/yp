@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @business-logic @guests @reservation
Feature: keep one primary guest per reservation

  As Reservation clerk, Front-desk supervisor
  I want to keep one primary guest per reservation
  So that documents and billing always have a single clear lead name

  Background:
    Given guests are attached to a reservation

  Scenario: Acceptance criteria
    Then Exactly one active guest on a reservation is the primary guest.
    And Making another guest primary automatically demotes the previous primary.
    And A guest added without check-in and check-out dates inherits them from the reservation.
    And The first guest attached defaults to one hundred percent of the bill.
