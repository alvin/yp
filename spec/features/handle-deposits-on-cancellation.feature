@persona:front-desk-supervisor @persona:daily-cash-reviewer @status:done @priority:5 @business-logic @deposits @cancellation
Feature: handle deposits on cancellation

  As Front-desk supervisor, Daily-cash reviewer
  I want to handle deposits on cancellation
  So that a cancelled stay's deposit is refunded or kept with a clear paper trail

  Background:
    Given a reservation holding a deposit is cancelled

  Scenario: Acceptance criteria
    Then Staff choose whether the deposit is refunded, kept, or decided later when cancelling.
    And The cancel dialog shows the deposit still held: received, less any already refunded, applied to the bill or kept.
    And A refund writes a negative deposit-refund line dated on the cancellation day.
    And A kept deposit writes a deposit-kept line that counts like a charge, so the cancelled stay's balance comes to zero.
    And After a refund or a keep the reservation no longer holds a deposit.
    And A deposit decided later stays held on the cancelled stay, and nothing reaches the daily cash report.
    And A cancelled stay still holding a deposit has Settle deposit, which refunds or keeps it, dated the day it is settled.
    And The daily cash report stays balanced after the deposit handling.
