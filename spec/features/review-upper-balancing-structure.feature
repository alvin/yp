# id: QURRrKXkBEUIEDgqF48S
@persona:daily-cash-reviewer @status:done @priority:4 @daily-cash @balancing @review
Feature: review upper balancing structure

  As Daily cash reviewer
  I want to review upper balancing structure
  So that they can confirm the upper balancing section is laid out for manual review

  Background:
    Given when a daily cash reviewer is checking the daily cash activity report

  Scenario: Acceptance criteria
    Then The upper balancing section is visible in the report.
    And The section is organized in a way that supports manual checking.
    And The reviewer can distinguish this section from the rest of the report.
