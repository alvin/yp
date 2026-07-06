# id: XkFhDGu37GxmENSRlUjt
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:2 @deposits @prepayments @ledger
Feature: classify deposit and prepayment activity for daily cash reporting

  As Reservation clerk, Front-desk supervisor
  I want to classify deposit and prepayment activity for daily cash reporting
  So that so that deposits received, deposits applied, and prepayments are correctly reflected in the daily cash package

  Background:
    Given when staff prepare daily cash totals and appendices from the print menu workflow

  Scenario: Acceptance criteria
    Then Deposit activity can be recorded as received, applied, refunded, or kept.
    And Prepayment activity can be recorded as received, applied, or refunded.
    And Deposit entries remain separate from prepayment entries.
    And The reservation shows the correct category for each money movement.
