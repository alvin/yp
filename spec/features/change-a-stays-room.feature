@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @rooms @occupancy
Feature: change a stay's room

  As Reservation clerk, Front-desk supervisor
  I want to change the room a stay holds, not only move it mid-stay
  So that a booking made in the wrong room, or swapped with another party, can be put right

  Background:
    Given a stay holds a room it should not

  Scenario: Acceptance criteria
    Then Any room on the stay can be changed to another room for the same nights, as it was in Access.
    And The room list marks rooms another stay holds for those nights as Booked.
    And A room can't be changed while a room charge for it is posted over those nights; the charge is removed first, so no bill charges a room the stay isn't in.
    And A room can't be changed to the room the stay moves from or to next door; that is undoing the move.
