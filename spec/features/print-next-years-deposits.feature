@persona:daily-cash-reviewer @persona:operations-lead @status:done @priority:3 @daily-cash @deposits @year-end @printing
Feature: print next year's deposits

  As Daily cash reviewer, Operations lead
  I want a yearly total of the deposits taken for future years' stays
  So that the year end has the figure without adding up the daily appendices

  Background:
    Given the lodge closes its year on December 31

  Scenario: Acceptance criteria
    Then The report covers deposits received January 1 to December 31 of a chosen year, for stays arriving after that year.
    And It totals them month by month: how many, how much received, how much of it was refunded or kept within the year, and what is still held.
    And A $0.00 deposit line is not counted as a deposit.
    And It opens from the Print Center's Year end card and prints like the lodge's other reports.
