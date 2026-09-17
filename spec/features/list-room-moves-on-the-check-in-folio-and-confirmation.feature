@persona:front-desk-supervisor @persona:reservation-clerk @status:done @priority:4 @documents @room-moves
Feature: list room moves on the check-in folio and confirmation

  As Front-desk supervisor, Reservation clerk
  I want to list room moves on the check-in folio and confirmation
  So that a party moving between accommodations reads the whole stay off the slip they are given

  Background:
    Given a reservation moves between rooms during the stay

  Scenario: Acceptance criteria
    Then The check-in folio lists every room of the stay with its own dates and party size.
    And The confirmation lists them the same way.
    And The rooms are listed in the order the stay occupies them.
    And A stay that never moves prints exactly one room, as it did before.
