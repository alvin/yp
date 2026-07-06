@persona:reservation-clerk @persona:operations-lead @status:done @priority:5 @business-logic @reservation @numbering
Feature: assign reservation numbers automatically

  As Reservation clerk, Operations lead
  I want to assign reservation numbers automatically
  So that every stay gets a unique in-house number without staff tracking a counter

  Background:
    Given a new reservation is saved without a reservation number

  Scenario: Acceptance criteria
    Then The database assigns the next in-house reservation number when none is supplied.
    And Assigned numbers are unique even when two reservations are saved at the same time.
    And Numbering continues from the highest number already stored, including numbers loaded from the old Access system.
    And A reservation saved with an explicit number keeps that number.
