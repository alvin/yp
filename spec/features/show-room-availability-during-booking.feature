@persona:reservation-clerk @status:done @priority:4 @rooms @availability @booking
Feature: show room availability during booking

  As Reservation clerk
  I want to show room availability during booking
  So that staff pick a free room with its bed layout in view

  Background:
    Given staff are choosing a room for a stay window

  Scenario: Acceptance criteria
    Then The room list follows the lodge's own room order.
    And Each room shows its brief bed-layout description.
    And Rooms already occupied for the stay window are flagged as unavailable.
    And Cancelled reservations do not block a room's availability.
