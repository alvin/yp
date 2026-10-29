@persona:kitchen-coordinator @status:done @priority:3 @kitchen @reporting @print @filter
Feature: print filtered kitchen report for selected date

  As Kitchen coordinator
  I want to print filtered kitchen report for selected date
  So that the kitchen sees every special-diet guest arriving over the days ahead

  Background:
    Given the kitchen coordinator runs the 7-day kitchen report from the Print Center

  Scenario: Acceptance criteria
    Then The report is titled Weekly Kitchen Report; a date range can be chosen, and the range prints in the report heading.
    And The report lists each guest with a diet on file whose stay arrives within the range, one row each: last name, first name, the diet and kitchen notes, arrival date and departure date. The reservation number isn't printed, and there is no separate Guest Diet column.
    And The diet and the kitchen notes print together in one column, word for word as entered, as on the Daily Kitchen/Meal Report.
    And A stay arriving outside the range is left out.
    And A diet record with neither a diet nor notes is left out.
