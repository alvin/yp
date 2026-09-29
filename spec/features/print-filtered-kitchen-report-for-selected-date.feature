@persona:kitchen-coordinator @status:done @priority:3 @kitchen @reporting @print @filter
Feature: print filtered kitchen report for selected date

  As Kitchen coordinator
  I want to print filtered kitchen report for selected date
  So that the kitchen sees every special-diet guest arriving over the days ahead

  Background:
    Given the kitchen coordinator runs the 7-day kitchen report from the Print Center

  Scenario: Acceptance criteria
    Then A date range can be selected before the report is printed
    And The report lists each guest with a diet on file whose stay arrives within the chosen range
    And The printed report is readable and suitable for kitchen planning
    And A stay arriving outside the range is left out, and the range prints in the report heading
    And A diet record with neither a diet nor notes is left out.
