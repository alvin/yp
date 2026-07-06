@persona:daily-cash-reviewer @status:done @priority:4 @daily-cash @reconciliation @screen-only
Feature: surface daily cash balance checks on screen

  As Daily-cash reviewer
  I want to surface daily cash balance checks on screen
  So that imbalances show up before the sheet is printed and reconciled by hand

  Background:
    Given the daily cash workspace is open for a business date

  Scenario: Acceptance criteria
    Then The report shows whether the day's two sections balance, and the difference when they do not.
    And Each appendix states whether its total agrees with the matching daily cash line.
    And The balance indicators are screen aids only and never print on the cash sheet.
    And Appendices and the report share one business date while moving between tabs.
