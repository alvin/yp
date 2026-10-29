@persona:printing-coordinator @persona:operations-lead @status:done @priority:2 @printing @in-house @occupancy
Feature: print in-house occupancy report

  As Printing coordinator, Operations lead
  I want to print in-house occupancy report
  So that the front desk and operations team have arrivals, departures, room moves, and in-house totals on paper

  Background:
    Given the printing coordinator runs daily operations reports

  Scenario: Acceptance criteria
    Then Printed output includes Arrive Today, In House and Depart Today sections.
    And A party moving rooms that day prints under In House, the room it leaves above the room it moves into, as on Access's report; a move has no section of its own.
    And Each section prints under its own heading, in the order the day runs, separated from the one before it.
    And A row is not labelled with its section a second time, the heading it sits under says which it is.
    And A section with nothing in it is left out rather than printed empty.
    And Each row shows the reservation, guest, guest count, room, and its in and out dates; an arriving stay also shows its arrival time, and no other does, as on Access's report.
    And Each row prints its room's occupancy notes, as Access did, and not the guest's requests, which have their own Requests report.
    And The summary line shows the guests arriving, departing and in house, and Total Guests: those arriving and those in house, not those departing, as Access's report counted them.
    And A party moving rooms that day is counted once, in the room it moves into, where Access counted both rooms.
