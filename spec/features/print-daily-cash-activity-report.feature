# id: p1rqjacjEpXJ6szpQP8t
@status:done @priority:5 @printing @reports @daily-cash @documents
Feature: print daily cash activity report

  As a user
  I want to print daily cash activity report
  So that they can generate the paper output needed for daily records and office use

  Background:
    Given when staff use the report and document menu to produce the daily cash activity appendix as a guest-document output

  Scenario: Acceptance criteria
    Then The report can be started from the print screen without leaving the menu area.
    And The output matches the daily cash activity appendix used by staff for operational records.
    And The report is produced in a printable format suitable for the lodge’s existing paper workflow.
    And The action supports the documented batch or individual print path used on this screen.
