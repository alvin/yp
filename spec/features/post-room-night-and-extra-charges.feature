# id: D3btoD8xgPr97Vuq8vxr
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @charges @ledger @billing
Feature: post room-night and extra charges

  As Reservation clerk, Front-desk supervisor
  I want to post room-night and extra charges
  So that the stay balance reflects the right room and incidental charges

  Background:
    Given staff need to add stay charges for a reservation

  Scenario: Acceptance criteria
    Then Room-night charges can be added for the reservation.
    And Extra charges can be added for the reservation.
    And Each charge line can be entered with a date and a quantity.
    And The reservation total updates to include the posted charge lines.
