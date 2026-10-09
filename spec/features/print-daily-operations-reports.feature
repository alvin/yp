@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:5 @printing @daily-operations @reports @date-range
Feature: print daily operations reports

  As Printing coordinator, Front-desk supervisor
  I want to print daily operations reports
  So that the lodge can print the exact daily report needed for any date without extra manual sorting

  Background:
    Given the coordinator prints daily operations reports from the Print Center

  Scenario: Acceptance criteria
    Then The user chooses one report date, and each daily report in the print menu opens for that date.
    And The printed report is for the chosen date, and can be re-dated from the report screen.
    And An optional end date feeds only the report that takes a range, the 7-day kitchen report; without one, that report runs seven days from the report date.
    And Printed reports number their pages, as the lodge's originals did.
    And Each room or guest on a daily report is ruled off from the next and every other one is shaded, so a line reads straight across the sheet; the shading prints.
    And The print output matches the lodge’s standard report formatting and naming.
