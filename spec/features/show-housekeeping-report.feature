# id: ON8UDFWv7A1Gorj6O3yr
@persona:operations-lead @status:done @priority:5 @print @report @housekeeping
Feature: show housekeeping report

  As Operations lead
  I want to show housekeeping report
  So that they can print the housekeeping report for staff use

  Background:
    Given the operations team opens the print menu to produce daily operational reports

  Scenario: Acceptance criteria
    Then The housekeeping report appears as a selectable option in the print menu.
    And Selecting the housekeeping report opens the expected report for printing.
    And The report uses lodge-appropriate wording and format for staff use.
