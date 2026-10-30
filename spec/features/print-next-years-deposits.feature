@persona:daily-cash-reviewer @persona:operations-lead @status:done @priority:3 @daily-cash @deposits @year-end @printing @admin
Feature: print next year's deposits

  As Daily cash reviewer, Operations lead
  I want a total of the deposits taken for stays still to come, over any range of days
  So that the year end has the figure without adding up the daily appendices

  Background:
    Given the lodge closes its year on December 31

  Scenario: Acceptance criteria
    Then The report covers deposits received between a From and a To date, for stays arriving after the To date; it starts on January 1 to December 31 of this year.
    And It totals them month by month: how many, how much received, how much of it was refunded or kept within the range, and what is still held.
    And A $0.00 deposit line is not counted as a deposit.
    And It is the admin area's Year End Deposits, and prints like the lodge's other reports.
