@persona:daily-cash-reviewer @status:done @priority:5 @daily-cash @appendix @audit @review
Feature: provide appendix drillback

  As Daily cash reviewer
  I want to provide appendix drillback
  So that the reviewer can trace the summary back to the related appendix detail for audit confidence

  Background:
    Given a daily cash summary is being checked and an appendix total needs support

  Scenario: Acceptance criteria
    Then The Daily Cash Activity Report and its appendices — Deposits received, Deposits applied, Cashier detail and Items cashed out — sit side by side as tabs.
    And Moving from the report to an appendix, and back, keeps the business date.
