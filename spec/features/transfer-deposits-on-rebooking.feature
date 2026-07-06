@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @business-logic @deposits @rebooking
Feature: transfer deposits on rebooking

  As Reservation clerk, Front-desk supervisor
  I want to transfer deposits on rebooking
  So that a guest's deposit follows their stay to the new dates

  Background:
    Given a reservation holding a deposit is re-booked to new dates

  Scenario: Acceptance criteria
    Then Re-booking creates a new reservation for the same guests with the new dates.
    And The held deposit moves to the new reservation through an offsetting refund and received pair.
    And The transfer lines are visible in daily cash and net to zero for the day.
    And The original reservation is cancelled and cross-referenced to the new number.
