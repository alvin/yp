@persona:reservation-clerk @persona:operations-lead @status:done @priority:5 @business-logic @reservation @policy
Feature: enforce the one-year reservation horizon

  As Reservation clerk, Operations lead
  I want to enforce the one-year reservation horizon
  So that stays are stored only one year in advance, per the reservation policy

  Background:
    Given a reservation is saved with an arrival date

  Scenario: Acceptance criteria
    Then A reservation arriving more than one year and a week from today is rejected by the database.
    And The horizon is checked against the arrival date only, so a stay starting inside it may run past it.
    And The week of grace lets a party re-book the same week next season, which falls 52 weeks on.
    And The rejection happens no matter how the reservation is written, including direct database edits.
    And Reservations arriving within the horizon save normally.
    And Historical reservations loaded from the old system are not affected.
