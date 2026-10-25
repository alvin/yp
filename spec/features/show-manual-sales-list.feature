@persona:operations-lead @persona:front-desk-supervisor @status:done @priority:3 @print @charges @liquor @manual-sales-list
Feature: show manual sales list

  As Operations lead, Front-desk supervisor
  I want to show manual sales list
  So that they can print the day's manual sales sheet from the print menu

  Background:
    Given staff choose daily operations reports in the print menu

  Scenario: Acceptance criteria
    Then The liquor-charge list appears as a selectable option in the print menu.
    And Selecting it opens the Manual Sales List for the chosen date: each occupied room in the lodge's room order, with its reservation number and guest.
    And The sheet carries no charges; staff fill it in by hand, as on the lodge's original.
    And Cancelled reservations are left off; Show cancelled adds them back, each with a ticked box beside its reservation number where the others have an empty one.
