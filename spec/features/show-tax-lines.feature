@persona:daily-cash-reviewer @persona:operations-lead @status:done @priority:5 @dcar @tax @reconciliation
Feature: show tax lines

  As Daily cash reviewer, Operations lead
  I want to show tax lines
  So that the report reflects tax activity clearly for manual balancing

  Background:
    Given the daily cash report is being prepared

  Scenario: Acceptance criteria
    Then The upper section carries a line for each tax, named by its rate type — GST, PST, HST, Liquor Tax, Room Tax, Other Tax and Dest Mktg Tax — printed even at zero.
    And Each line is that tax's total on the charges the day counts, and Total Taxes adds them up.
    And The taxes count toward the day's revenue and expenses.
