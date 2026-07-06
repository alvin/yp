# id: KQzRWc7p0cwJaigcxraO
@persona:daily-cash-reviewer @status:done @priority:5 @daily-cash @dcar @report-view
Feature: show daily cash activity report

  As Daily cash reviewer
  I want to show daily cash activity report
  So that they can see the daily cash activity report for that day

  Background:
    Given when a daily cash reviewer has selected a day

  Scenario: Acceptance criteria
    Then The report appears for the selected day.
    And The report reflects the day the reviewer chose.
    And The reviewer can view the report before moving on to supporting sections.
