@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @business-logic @guests @reservation
Feature: keep one guest per reservation

  As Reservation clerk, Front-desk supervisor
  I want to keep one guest per reservation
  So that each party's charges and payments stay on a reservation of its own, and documents and billing always carry one clear name

  Background:
    Given a reservation is booked under a guest

  Scenario: Acceptance criteria
    Then A reservation is booked under one guest, its primary guest.
    And A second guest on the same reservation is refused, even one written straight to the database: a room two parties share is booked as two reservations, each flagged Shared, each with its own charges and payments.
    And Every charge and payment on a reservation is posted to its guest. Nothing splits a bill or a rate on its own: whether a shared room's rate is split, and how, is the desk's call in what it charges each reservation.
    And A guest put on a reservation without check-in and check-out dates takes them from the reservation.
