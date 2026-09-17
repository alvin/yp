@persona:front-desk-supervisor @persona:reservation-clerk @status:done @priority:4 @documents @checkout-bill
Feature: name the room on check-out bill room charges

  As Front-desk supervisor, Reservation clerk
  I want to name the room on check-out bill room charges
  So that a departing guest can see which room each night was charged for

  Background:
    Given a check-out bill is printed for a stay carrying room-night charges

  Scenario: Acceptance criteria
    Then A room-night charge names the room it was posted for.
    And A room that carries a number shows it; a room known only by name shows the name alone.
    And A stay that moved rooms shows a separate, separately named charge for each.
    And Charges that are not for a room are described as they were before.
