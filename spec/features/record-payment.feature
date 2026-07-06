# id: b5tvrDUOjagRkrCC0EJs
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @payment @ledger @receipt
Feature: record payment

  As Reservation clerk, Front-desk supervisor
  I want to record payment
  So that staff can capture the receipt quickly and keep the stay balance current

  Background:
    Given a guest or payer gives money for a reservation

  Scenario: Acceptance criteria
    Then A payment can be added to the reservation.
    And The payment changes the stay balance appropriately.
    And The payment is visible in the reservation’s financial history.
    And Staff can review the recorded payment after saving it.
