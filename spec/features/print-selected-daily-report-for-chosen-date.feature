# id: T0zRt2HlmkQ4jA0BmqyA
@persona:front-desk-supervisor @status:done @priority:4 @printing @reports @date-based
Feature: print selected daily report for chosen date

  As Front-desk supervisor
  I want to print selected daily report for chosen date
  So that the team can print the exact report needed for filing, review, or handoff

  Background:
    Given a staff member needs one daily report for a specific date

  Scenario: Acceptance criteria
    Then The user can choose a single daily report from the print menu.
    And The user can choose the date the report should come from.
    And Only the selected report for the chosen date is prepared for printing.
    And The printed report reflects the selected date clearly.
