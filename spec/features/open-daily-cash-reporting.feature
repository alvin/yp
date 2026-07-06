# id: m1U2J2AyhPRxlmyPW8BI
@persona:daily-cash-reviewer @persona:front-desk-supervisor @status:done @priority:5 @cash @reporting @navigation
Feature: open daily cash reporting

  As Daily cash reviewer, Front-desk supervisor
  I want to open daily cash reporting
  So that they can move directly from lookup to cash reporting work

  Background:
    Given front-desk staff need to review daily cash activity

  Scenario: Acceptance criteria
    Then Daily cash reporting is available from the home screen
    And Opening it takes the user into the cash reporting area
    And The action can be reached without using another screen first
