@persona:daily-cash-reviewer @persona:front-desk-supervisor @status:done @priority:5 @daily-cash @upper-section @donation
Feature: show donation line in daily cash upper section

  As Daily cash reviewer, Front-desk supervisor
  I want to show donation line in daily cash upper section
  So that donations are visible and not mixed into other charge categories

  Background:
    Given office staff review the daily cash activity report upper section before balancing

  Scenario: Acceptance criteria
    Then The upper section carries a Donation line among its adjustments.
    And Donations recorded that day land on the Donation line.
    And The donation amount counts toward the upper total and the day's receipts.
    And The Donation line prints even when the day's donations are zero.
