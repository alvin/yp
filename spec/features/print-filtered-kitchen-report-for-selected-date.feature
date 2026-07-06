# id: vDZaFR3Kk2cg8R3vww2n
@persona:kitchen-coordinator @status:done @priority:3 @kitchen @reporting @print @filter
Feature: print filtered kitchen report for selected date

  As Kitchen coordinator
  I want to print filtered kitchen report for selected date
  So that so that the kitchen receives only the flagged entries for that date

  Background:
    Given when staff run allergy-only kitchen output for a chosen service day

  Scenario: Acceptance criteria
    Then A date range can be selected before the report is printed
    And The printed report includes only guests and meals within the chosen range
    And The printed report is readable and suitable for kitchen planning
    And The report excludes records outside the selected range
