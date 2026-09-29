# id: eCN4tSrtdtwgjBtSPIUL
@persona:printing-coordinator @persona:operations-lead @status:done @priority:2 @printing @in-house @occupancy
Feature: print in-house occupancy report

  As Printing coordinator, Operations lead
  I want to print in-house occupancy report
  So that the front desk and operations team have arrivals, departures, room moves, and in-house totals on paper

  Background:
    Given the printing coordinator runs daily operations reports

  Scenario: Acceptance criteria
    Then Report prints for the selected date.
    And Printed output includes Arrive Today, Move In, Move Out, In House and Depart Today sections.
    And Each section prints under its own heading, in the order the day runs, separated from the one before it.
    And A row is not labelled with its section a second time, the heading it sits under says which it is.
    And A section with nothing in it is left out rather than printed empty.
    And The summary line shows the Arrive Today, Depart Today and In House counts and Total Guests, as on the lodge's established report; a party moving rooms is counted once.
