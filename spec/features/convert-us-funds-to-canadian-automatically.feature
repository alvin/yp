@persona:front-desk-supervisor @persona:daily-cash-reviewer @status:done @priority:5 @business-logic @payments @currency
Feature: convert US funds to Canadian automatically

  As Front-desk supervisor, Daily-cash reviewer
  I want to convert US funds to Canadian automatically
  So that daily cash always balances in Canadian dollars

  Background:
    Given a payment is saved in US funds

  Scenario: Acceptance criteria
    Then The database fills the Canadian amount using the exchange rate effective on the payment date.
    And A Canadian payment carries its own amount as the Canadian value.
    And Changing the amount, currency, or date recalculates the Canadian value.
    And The payment code is derived from the payment category automatically.
