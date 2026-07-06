# id: 1FYhR2KPsW7h44bW854x
@persona:daily-cash-reviewer @persona:operations-lead @status:done @priority:5 @dcar @tax @reconciliation
Feature: show tax lines

  As Daily cash reviewer, Operations lead
  I want to show tax lines
  So that the report reflects tax activity clearly for manual balancing

  Background:
    Given the daily cash report is being prepared

  Scenario: Acceptance criteria
    Then Tax lines appear for each taxable charge included in the day’s activity.
    And Each tax line is shown with the amount used in the report calculation.
    And The tax rate type used for the calculation is visible in the report detail.
    And Tax lines are presented in a way that supports the report’s two-section cash review process.
