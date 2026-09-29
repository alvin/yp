@persona:reservation-clerk @persona:printing-coordinator @persona:operations-lead @status:done @priority:3 @rooms @moves @housekeeping @in-house
Feature: show an accurate room status for the day

  As Reservation clerk, Printing coordinator, Operations lead
  I want every room's status for a day to be worked out from its dates, never assumed
  So that housekeeping and the desk can trust what each room is doing that day

  Background:
    Given a stay holds one or more rooms

  Scenario: Acceptance criteria
    Then A room not yet reached reads Future, and a room already left reads Past.
    And A room reads In House only on a day it is held with no arrival, departure or move in it.
    And The room a party leaves on a move day reads Move Out, on the housekeeping report and the In House report.
    And The In House report prints Move Out beside Move In.
    And A party moving rooms is counted once in the In House report's total guests.
