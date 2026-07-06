# id: eCN4tSrtdtwgjBtSPIUL
@persona:printing-coordinator @persona:operations-lead @status:done @priority:2
Feature: print in-house occupancy report

  As Printing coordinator, Operations lead
  I want to print in-house occupancy report
  So that so that the front desk and operations team have arrivals, departures, room moves, and in-house totals on paper

  Background:
    Given when the printing coordinator runs daily operations reports

  Scenario: Acceptance criteria
    Then Report prints for the selected date.
    And Printed output includes arrivals, departures, room moves, and in-house sections.
    And Printed output shows the section counts and total guests summary, matching the lodge's established report.
