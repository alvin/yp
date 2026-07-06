# id: KtdaFPavhDCVejuF6b7I
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @occupancy @room-move @stay-history
Feature: record room moves

  As Reservation clerk, Front-desk supervisor
  I want to record room moves
  So that staff can keep the stay history accurate and match the room movement shown in operations

  Background:
    Given a guest changes rooms during a stay

  Scenario: Acceptance criteria
    Then A room move can be added for the current stay.
    And The move shows both the room being left and the room being entered.
    And The stay keeps the room move as part of its occupancy history.
    And The move is available for staff to review while working the reservation.
