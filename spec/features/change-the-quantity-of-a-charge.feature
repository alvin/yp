@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @charges @ledger @billing
Feature: change the quantity of a charge

  As Reservation clerk, Front-desk supervisor
  I want to change the quantity of a charge already posted
  So that a guest's drinks over a stay can be kept on one line, not a line for each

  Background:
    Given a charge is on a reservation's transactions

  Scenario: Acceptance criteria
    Then Each charge line has a pen beside its garbage can that changes its quantity, as Access allowed.
    And The line keeps its price per unit; its amount and taxes follow the new quantity.
    And On a room line the quantity is nights, and the nights the charge covers follow.
    And A quantity under one is refused; taking a line off is the garbage can's job.
    And The balance, the bill and the daily cash report show the line as changed.
