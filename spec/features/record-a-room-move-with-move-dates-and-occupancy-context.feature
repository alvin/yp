# id: PD2oxeCcZmmHsdfS8u2y
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @room-move @occupancy @history
Feature: record a room move with move dates and occupancy context

  As Reservation clerk, Front-desk supervisor
  I want to record a room move with move dates and occupancy context
  So that the move is captured clearly for operational follow-up and accurate reporting

  Background:
    Given a guest or stay changes from one room to another during an active stay

  Scenario: Acceptance criteria
    Then A staff member can record the move date for the room change.
    And The new room and the prior room are both visible in the stay history.
    And The occupancy context for the move is retained with the record.
