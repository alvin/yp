@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @reservation @stay @business-logic
Feature: change the dates of an existing reservation

  As Reservation clerk, Front-desk supervisor
  I want to change the dates of an existing reservation
  So that a guest extending or shortening their stay keeps one reservation instead of needing a new one

  Background:
    Given a booked guest changes how long they are staying

  Scenario: Acceptance criteria
    Then The arrival and departure dates of an existing reservation can be changed.
    And The reservation keeps its number, its guests, and its rooms.
    And The night count is recalculated from the new dates.
    And The guests on the stay and the rooms they occupy move with the dates, so occupancy and the daily reports stay correct.
    And A room booked for part of the stay only, such as after a room move, keeps its own dates.
    And The booking rules still apply — a departure on or before the arrival is refused.
