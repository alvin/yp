@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:2 @deposits @prepayments @ledger
Feature: classify deposit and prepayment activity for daily cash reporting

  As Reservation clerk, Front-desk supervisor
  I want to classify deposit and prepayment activity for daily cash reporting
  So that deposits received, deposits applied, and prepayments are correctly reflected in the daily cash package

  Background:
    Given staff record deposits and prepayments that feed the daily cash totals and appendices

  Scenario: Acceptance criteria
    Then Deposit activity can be recorded as received, refunded, or kept.
    And Prepayment activity can be recorded as received or refunded.
    And Staff never record a deposit or prepayment as applied: whatever a stay still holds is applied when the guest checks out.
    And Deposit entries remain separate from prepayment entries.
    And The reservation shows the correct category for each money movement.
