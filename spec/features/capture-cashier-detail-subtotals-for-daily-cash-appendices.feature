# id: cMIJymj3FvOvAr6EpM31
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:2 @cash-activity @billing @details
Feature: capture cashier detail subtotals for daily cash appendices

  As Reservation clerk, Front-desk supervisor
  I want to capture cashier detail subtotals for daily cash appendices
  So that so that cashier-level reconciliation is available for balancing checks

  Background:
    Given when staff generate daily cash appendix reports from the print menu

  Scenario: Acceptance criteria
    Then Additional transaction details can be entered for charges and payouts.
    And The entered details are available for daily cash reporting.
    And The entered details appear on printed bills where required.
    And The reservation retains the detail with the related transaction.
