@persona:front-desk-supervisor @persona:daily-cash-reviewer @status:done @priority:5 @business-logic @deposits @cancellation
Feature: handle deposits on cancellation

  As Front-desk supervisor, Daily-cash reviewer
  I want to handle deposits on cancellation
  So that a cancelled stay's deposit is refunded or kept with a clear paper trail

  Background:
    Given a reservation holding a deposit is cancelled

  Scenario: Acceptance criteria
    Then Staff choose whether the deposit is refunded or kept when cancelling.
    And A refund writes a negative deposit-refund line dated on the cancellation day.
    And A kept deposit writes a deposit-kept line so the money is recognized.
    And After either choice the reservation no longer holds a deposit.
    And The daily cash report stays balanced after the deposit handling.
