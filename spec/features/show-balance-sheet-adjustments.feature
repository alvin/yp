# id: bVNDB50z27YtJKWEInsU
@persona:daily-cash-reviewer @persona:operations-lead @status:done @priority:4 @adjustments @deposits @prepayments
Feature: show balance-sheet adjustments

  As Daily cash reviewer, Operations lead
  I want to show balance-sheet adjustments
  So that the reviewer can see how deposits and prepayments were received, applied, refunded, or kept

  Background:
    Given the daily cash report is being reviewed for deposit and prepayment handling

  Scenario: Acceptance criteria
    Then The report shows adjustment lines for deposit and prepayment activity.
    And The report distinguishes amounts received, applied, refunded, and kept.
    And Each adjustment type is visible when it applies to the day.
    And A reviewer can trace these adjustments in the daily balancing view.
