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
    And An optional end date feeds the reports that take a range: the 7-day kitchen report, which without one runs seven days from the report date, and the Cancellation report, which without one covers the week ending on it.
    And The Cancellation report is not a daily report: it is not among the daily reports' tabs, and picks its own range of days.
    And Printed reports carry no footer and no page numbers.
    And The reports set their lines a size smaller than the guest documents, and a date never breaks across two lines.
    And The Housekeeping, In House, Daily Kitchen/Meal and Weekly Kitchen reports print in portrait, their lines a size smaller again, and the dates in their lines as day and month without the year. A housekeeping note's date keeps it, since a note can date from an earlier stay, and so does the date in the heading.
    And Each room or guest on a daily report is ruled off from the next and every other one is shaded, so a line reads straight across the sheet; the shading prints.
    And The print output matches the lodge’s standard report formatting and naming.
