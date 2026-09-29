# id: FI0AKmNg8P9NoAklFOHO
@persona:printing-coordinator @persona:operations-lead @status:done @priority:5 @printing @reports @housekeeping
Feature: print housekeeping report

  As Printing coordinator, Operations lead
  I want to print housekeeping report
  So that housekeeping receives room-by-room instructions organized by stay status

  Background:
    Given the printing coordinator prepares the day's operational reports from the print menu

  Scenario: Acceptance criteria
    Then The housekeeping report appears as a selectable option in the print menu.
    And Report prints for the selected date.
    And Each occupied room is listed with its reservation, guest, guest count and stay dates.
    And Printed output follows the lodge room order, with each row's status for the day shown beside it: Arrive Today, Move In, Move Out, In House, or Depart Today.
    And Each room shows its latest housekeeping note with the date it was written.
    And Only report-facing instructions are included on the printout.
