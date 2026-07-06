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
    And Printed output follows the lodge room order, with each row's departure, stayover, or arrival status shown beside it.
    And Only report-facing instructions are included on the printout.
