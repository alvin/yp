@persona:printing-coordinator @persona:operations-lead @status:done @priority:5 @printing @reports @housekeeping
Feature: print housekeeping report

  As Printing coordinator, Operations lead
  I want to print housekeeping report
  So that housekeeping receives room-by-room instructions organized by stay status

  Background:
    Given the printing coordinator prepares the day's operational reports from the print menu

  Scenario: Acceptance criteria
    Then Each occupied room is listed with its guest, guest count and stay dates.
    And Each line starts with the room, and the reservation number isn't printed.
    And Printed output follows the lodge room order, with each row's status for the day shown beside it: Arrive Today, Move In, Move Out, In House, or Depart Today.
    And Each room shows its latest housekeeping note with the date it was written.
    And The report ends on Total Guests: those arriving and those staying on, not those departing, as Access's housekeeping report did; the same figure as the In House report's.
