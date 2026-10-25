@persona:daily-cash-reviewer @persona:operations-lead @status:done @priority:4 @adjustments @deposits @prepayments
Feature: show balance-sheet adjustments

  As Daily cash reviewer, Operations lead
  I want to show balance-sheet adjustments
  So that the reviewer can see how deposits and prepayments were received, applied, refunded, or kept

  Background:
    Given the daily cash report is being reviewed for deposit and prepayment handling

  Scenario: Acceptance criteria
    Then The upper section carries an adjustment line for each kind of deposit and prepayment activity: received, refunded, applied and kept.
    And Money received that day adds to the day's total, and a refund comes off it.
    And Whatever deposit or prepayment a stay still holds is applied on its check-out day and taken off the day's total; the Deposits Applied appendix lists each stay and agrees with the line.
    And A deposit kept is that day's revenue, on a Cancellation line, and comes off as Deposit (Kept), because the money came in earlier as a deposit.
    And A deposit or prepayment applied, a deposit kept, a gift certificate received and a bill sent to accounts move no money that day: they come off the day's total and are not receipts by type of cash.
