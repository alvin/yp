@persona:operations-lead @status:done @priority:5 @business-logic @consistency @database
Feature: keep data consistent for direct database edits

  As Operations lead
  I want to keep data consistent for direct database edits
  So that the database always functions correctly even when rows are changed outside the app

  Background:
    Given a row is inserted or edited directly in the database rather than through the app

  Scenario: Acceptance criteria
    Then A transaction inserted without taxes gets its amount and taxes completed automatically.
    And A payment inserted without a code or Canadian amount gets both completed automatically.
    And A reservation's number of nights always matches its arrival and departure dates.
    And Cancellation and confirmation dates stay consistent with their flags.
    And Reservation-guest check-in and check-out dates follow the reservation when its dates move.
