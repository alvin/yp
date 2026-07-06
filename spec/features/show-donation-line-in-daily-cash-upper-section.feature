# id: Q38S40VWBm0GLPkRU4pH
@persona:daily-cash-reviewer @persona:front-desk-supervisor @status:done @priority:3
Feature: show donation line in daily cash upper section

  As Daily cash reviewer, Front-desk supervisor
  I want to show donation line in daily cash upper section
  So that so that donations are visible and not mixed into other charge categories

  Background:
    Given when office staff review the daily cash activity report upper section before balancing

  Scenario: Acceptance criteria
    Then Upper section includes a clearly labeled Donations line.
    And Donation amount contributes to the upper total.
    And Donation line stays visible even when the amount is zero.
