# id: JZ9Dl36ZMd7LjngOlq7o
@persona:kitchen-coordinator @persona:printing-coordinator @status:done @priority:5 @kitchen @reporting @print @daily-workflow
Feature: print full meal report

  As Kitchen coordinator, Printing coordinator
  I want to print full meal report
  So that they can hand out the complete daily kitchen sheet for planning and preparation

  Background:
    Given the kitchen team needs the standard meal-planning report for a chosen day

  Scenario: Acceptance criteria
    Then The report can be produced for one selected day.
    And The printed output shows the full meal-planning list for that day.
    And The printed output is suitable for daily kitchen use without requiring screen review first.
    And The report matches the lodge’s expected printed workflow for meal planning.
