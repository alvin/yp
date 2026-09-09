@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @reservation @charges @deposits
Feature: record charges and deposits while booking

  As Reservation clerk, Front-desk supervisor
  I want to record charges and deposits while booking
  So that a deposit taken over the phone is captured with the booking rather than in a second pass

  Background:
    Given a deposit or pre-payment is taken while the stay is being booked

  Scenario: Acceptance criteria
    Then Items to be charged can be added while a new reservation is being entered.
    And A deposit or pre-payment can be recorded while a new reservation is being entered.
    And The same charges and deposit can be recorded while re-booking an existing reservation.
    And Lines entered can be reviewed and removed before the reservation is saved.
    And Saving posts the lines to the new reservation, so its balance and deposit are right without a further step.
    And The posted lines are dated the day the money moved, so they land on that day's cash report.
