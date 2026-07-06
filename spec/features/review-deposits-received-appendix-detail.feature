# id: bappxRCwIkBDUZiRZ51Q
@persona:daily-cash-reviewer @persona:front-desk-supervisor @status:done @priority:5 @dcar @deposits @appendix @detail
Feature: review deposits received appendix detail

  As Daily cash reviewer, Front-desk supervisor
  I want to review deposits received appendix detail
  So that they can confirm deposits received are summarized by payment type

  Background:
    Given staff open the appendix details viewer for the daily cash report

  Scenario: Acceptance criteria
    Then Deposit received detail is grouped by payment type
    And Each line shows its payment amount, funds, and Canadian value within its group
    And The day's total matches the deposit line on the Daily Cash Activity Report
    And Staff can compare the grouped detail to the report total without leaving the viewer
