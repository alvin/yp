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
    And Whatever deposit or prepayment a stay still holds is applied on its check-out day and taken off the day's total; the Deposits Applied appendix lists each stay and agrees with the line.
    And A deposit kept is that day's revenue, on a Cancellation line, and comes off as Deposit (Kept), because the money came in earlier as a deposit.
    And A deposit or prepayment applied, a deposit kept, a gift certificate received and a bill sent to accounts move no money that day: they come off the day's total and are not receipts by type of cash.
