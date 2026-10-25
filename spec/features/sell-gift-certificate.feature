@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @gift-certificate @cash @charges
Feature: sell gift certificate

  As Reservation clerk, Front-desk supervisor
  I want to sell gift certificate
  So that the sale counts as a charge-side activity and flows into daily cash reporting

  Background:
    Given staff need to sell a gift certificate at the desk

  Scenario: Acceptance criteria
    Then Staff record a gift certificate sale on a reservation's transactions: the certificate charged as an item, the money taken as a payment.
    And The sale is a charge on the daily cash report, on its Gift Certificate line, the day it is sold.
    And The money taken is in that day's receipts, so the day balances.
