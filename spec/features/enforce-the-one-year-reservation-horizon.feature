@persona:reservation-clerk @persona:operations-lead @status:done @priority:5 @business-logic @reservation @policy
Feature: enforce the one-year reservation horizon

  As Reservation clerk, Operations lead
  I want to enforce the one-year reservation horizon
  So that stays are stored only one year in advance, per the reservation policy

  Background:
    Given a reservation is saved with an arrival date

  Scenario: Acceptance criteria
    Then A reservation whose arrival is more than one year past its booking date is rejected by the database.
    And The rejection happens no matter how the reservation is written, including direct database edits.
    And Reservations arriving within one year save normally.
    And Historical reservations loaded from the old system are not affected.
