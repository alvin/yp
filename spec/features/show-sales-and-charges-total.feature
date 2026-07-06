# id: a20890GxkHEHCbbt986A
@persona:daily-cash-reviewer @persona:operations-lead @status:done @priority:5 @sales @charges @daily-report
Feature: show sales and charges total

  As Daily cash reviewer, Operations lead
  I want to show sales and charges total
  So that the reviewer can see the overall sales and charges amount at a glance

  Background:
    Given the daily cash report is being checked for revenue completeness

  Scenario: Acceptance criteria
    Then The report displays a clear line for total sales and charges.
    And The line is visible in the daily cash balancing view.
    And The amount is presented as a single combined total.
    And A reviewer can identify this total without opening a separate section.
