@persona:kitchen-coordinator @persona:printing-coordinator @persona:operations-lead @status:done @priority:5 @kitchen @reporting @print @daily-workflow
Feature: print full meal report

  As Kitchen coordinator, Printing coordinator, Operations lead
  I want to print full meal report
  So that they can hand out the complete daily kitchen sheet for planning and preparation

  Background:
    Given the kitchen team needs the standard meal-planning report for a chosen day

  Scenario: Acceptance criteria
    Then The kitchen report appears as a selectable option in the print menu.
    And The report is produced for the one day chosen, and the day prints in its heading.
    And It lists every stay in house that day with a diet on file, and no other: its reservation number, guest, arrival and departure dates, and the diet and kitchen notes together.
    And The diet and notes print word for word as they were entered.
    And The report carries the day's Total Guests.
    And On screen it can be narrowed to the stays whose diet mentions an allergy; the narrowed list carries no Total Guests.
