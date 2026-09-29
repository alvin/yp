@persona:kitchen-coordinator @persona:printing-coordinator @persona:operations-lead @status:done @priority:5 @kitchen @reporting @print @daily-workflow
Feature: print full meal report

  As Kitchen coordinator, Printing coordinator, Operations lead
  I want to print full meal report
  So that they can hand out the complete daily kitchen sheet for planning and preparation

  Background:
    Given the kitchen team needs the standard meal-planning report for a chosen day

  Scenario: Acceptance criteria
    Then The kitchen report appears as a selectable option in the print menu.
    And The report can be produced for one selected day.
    And The printed output lists every stay in house that day with a diet on file, the diet and kitchen notes together.
    And Each row shows the stay's arrival and departure dates.
    And The report carries the day's Total Guests, a party moving rooms counted once.
    And The printed output is suitable for daily kitchen use without requiring screen review first.
    And The report matches the lodge’s expected printed workflow for meal planning.
