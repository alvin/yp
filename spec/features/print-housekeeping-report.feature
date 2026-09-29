# id: FI0AKmNg8P9NoAklFOHO
@persona:printing-coordinator @persona:operations-lead @status:done @priority:2
Feature: print housekeeping report

  As Printing coordinator, Operations lead
  I want to print housekeeping report
  So that so that housekeeping receives room-by-room instructions organized by stay status

  Background:
    Given when the printing coordinator prepares next-day operational packets

  Scenario: Acceptance criteria
    Then Report prints for the selected date.
    And Printed output follows the lodge room order, with each row's status for the day shown beside it: Arrive Today, Move In, Move Out, In House, or Depart Today.
    And Only report-facing instructions are included on the printout.
