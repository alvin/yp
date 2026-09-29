# id: YQMfTXOUVs4F3gIzYoh5
@persona:daily-cash-reviewer @persona:front-desk-supervisor @status:done @priority:4 @daily-cash @appendix @payment-types @subtotals
Feature: show subtotal per payment type in cashier detail appendix

  As Daily cash reviewer, Front-desk supervisor
  I want to show subtotal per payment type in cashier detail appendix
  So that each payment type has a visible subtotal for review

  Background:
    Given a front-desk supervisor reviews the cashier detail appendix for the daily cash report

  Scenario: Acceptance criteria
    Then Receipts are listed by payment type, each type with its own subtotal.
    And The appendix closes with a total for the day.
    And The day's total matches the receipts on the Daily Cash Activity Report.
    And The subtotals are shown as part of the standard report output.
