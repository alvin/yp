@persona:daily-cash-reviewer @status:done @priority:5 @daily-cash @currency @review @mvp
Feature: show receipts converted to canadian dollars

  As Daily cash reviewer
  I want to show receipts converted to canadian dollars
  So that the reviewer can see the amount in Canadian dollars for balancing without changing the lodge’s existing cash review process

  Background:
    Given daily cash is being reviewed and a receipt includes U.S. funds

  Scenario: Acceptance criteria
    Then The deposits received detail shows a receipt taken in U.S. funds at its U.S. amount, marked as U.S. funds, beside its Canadian value at the day's exchange rate.
    And A receipt already in Canadian dollars shows the same amount on both sides, marked Canadian.
    And The cashier detail and the cash sheet count every receipt at its Canadian value, and the cash sheet says that U.S. amounts are converted.
