# id: 5oJmv5pG1cNcSnONViJc
@persona:front-desk-supervisor @status:done @priority:5 @daily-cash @upper-section @donation
Feature: show donation line in upper section

  As Front-desk supervisor
  I want to show donation line in upper section
  So that the donation amount is visible in the upper section of the balance sheet

  Background:
    Given when a front-desk supervisor prepares the daily cash balance

  Scenario: Acceptance criteria
    Then The donation amount appears in the upper section of the daily cash balance view.
    And The amount is clearly separated from other cash lines.
    And The donation line can be reviewed before the balance is finalized.
    And The line is available in the same daily workflow used for cash balancing.
