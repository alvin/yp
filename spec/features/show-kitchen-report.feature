# id: hyUOz22FryWuYOKXkd0B
@persona:operations-lead @status:done @priority:5 @print @report @kitchen
Feature: show kitchen report

  As Operations lead
  I want to show kitchen report
  So that they can print the kitchen report for staff use

  Background:
    Given the operations team opens the print menu to produce daily operational reports

  Scenario: Acceptance criteria
    Then The kitchen report appears as a selectable option in the print menu.
    And Selecting the kitchen report opens the expected report for printing.
    And The report uses lodge-appropriate wording and format for staff use.
