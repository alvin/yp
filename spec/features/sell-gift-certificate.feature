# id: d4R08ndmljixNqOTEHAJ
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @gift-certificate @cash @charges
Feature: sell gift certificate

  As Reservation clerk, Front-desk supervisor
  I want to sell gift certificate
  So that the sale counts as a charge-side activity and flows into daily cash reporting

  Background:
    Given when staff need to sell a gift certificate at the desk

  Scenario: Acceptance criteria
    Then Staff can record a gift certificate sale from the transaction workspace.
    And The sale is treated as a charge-side activity.
    And The sale contributes to daily cash reporting.
    And The transaction remains part of the reservation office workflow.
