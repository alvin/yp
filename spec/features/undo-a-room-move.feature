@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:3 @rooms @moves
Feature: undo a room move

  As Reservation clerk, Front-desk supervisor
  I want to undo a room move that is no longer needed
  So that when a cancellation frees the room, the party stays put without rebooking the stay

  Background:
    Given a stay has a room move booked

  Scenario: Acceptance criteria
    Then A room move can be undone from the stay's rooms, the way a charge is removed.
    And Undoing a move keeps the stay in the room it was leaving, through the end of the move.
    And A stay that moved out and back is left in one room.
    And Where two rooms moved on the same day, staff choose which room the stay goes back to.
    And A stay's first room, and a room added alongside another, cannot be undone as a move.
    And Charges already posted stay as posted.
