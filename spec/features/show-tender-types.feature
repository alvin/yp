# id: xOwRSZNXitrmq00NAxQB
@persona:daily-cash-reviewer @persona:operations-lead @status:done @priority:5 @dcar @tenders @reporting
Feature: show tender types

  As Daily cash reviewer, Operations lead
  I want to show tender types
  So that the report lists the tender categories needed for lodge cash review

  Background:
    Given cash and non-cash payments are summarized for the daily cash report

  Scenario: Acceptance criteria
    Then The report shows Mastercard, Visa, Amex, Debit Card, Cash, Cheque, and Traveller’s Cheque when present.
    And The report shows US variants where they are used.
    And The report shows special categories including Gift Certificate, None (Sent to A/R), Paid Out, and ICS Crossover when present.
    And Every tender type prints, including zero-activity lines, matching the lodge's established cash sheet.
    And Tender lines support the lodge’s manual reconciliation workflow.
