# id: LfnYda3roP0VGmgWYnbj
@persona:operations-lead @status:done @priority:5 @manual-sales-list @filtering @cancelled-reservations
Feature: exclude cancelled reservations

  As Operations lead
  I want to exclude cancelled reservations
  So that staff only review active items and avoid working from reservations that should no longer be counted

  Background:
    Given a manual sales list is prepared for daily review

  Scenario: Acceptance criteria
    Then Cancelled reservations do not appear in the active list for daily review.
    And Non-cancelled reservations still appear normally.
    And The list contains no cancelled reservation lines among the items used for the day’s manual review.
