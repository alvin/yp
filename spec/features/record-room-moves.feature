@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @occupancy @room-move @stay-history
Feature: record room moves

  As Reservation clerk, Front-desk supervisor
  I want to record room moves
  So that staff can keep the stay history accurate and match the room movement shown in operations

  Background:
    Given a guest changes rooms during a stay

  Scenario: Acceptance criteria
    Then A room move can be added for the current stay, naming the room being left, the new room and the move date.
    And The room being left closes on the move date and the new room opens on it, running to the end of the stay.
    And Both rooms stay in the stay history, for staff to review while working the reservation.
    And The party size carries over to the new room.
    And The move date offers only the dates a move can fall on — through the check-out date for the room the stay ends in — starting on today when today is one of them and otherwise on the first.
    And A move on the check-out date extends the stay to the departure chosen, one night on unless changed; the new room alone covers the added nights.
