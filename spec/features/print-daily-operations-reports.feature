# id: aTIpm3uEewevs4fkXjF7
@persona:printing-coordinator @status:done @priority:5 @printing @daily-operations @date-range
Feature: print daily operations reports

  As Printing coordinator
  I want to print daily operations reports
  So that the lodge can batch the right daily operations reports for printing without extra manual sorting

  Background:
    Given the coordinator needs reports for a specific date range that is supported

  Scenario: Acceptance criteria
    Then The user can choose a start date and an end date for the print run.
    And Only reports within the selected supported date range are included.
    And The print output matches the lodge’s standard report formatting and naming.
    And The user can review the selected range before sending it to print.
