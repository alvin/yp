# id: YQMfTXOUVs4F3gIzYoh5
@persona:front-desk-supervisor @status:done @priority:4 @daily-cash @appendix @payment-types @subtotals
Feature: show subtotal per payment type in cashier detail appendix

  As Front-desk supervisor
  I want to show subtotal per payment type in cashier detail appendix
  So that each payment type has a visible subtotal for review

  Background:
    Given when a front-desk supervisor reviews the cashier detail appendix for the daily cash report

  Scenario: Acceptance criteria
    Then Each payment type has its own subtotal in the cashier detail appendix.
    And The subtotals are easy to review within the report.
    And The appendix supports checking payment-type totals against the daily balance.
    And The subtotals are shown as part of the standard report output.
