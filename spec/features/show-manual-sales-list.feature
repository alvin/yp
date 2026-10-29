@persona:operations-lead @persona:front-desk-supervisor @status:done @priority:3 @print @charges @liquor @manual-sales-list
Feature: show manual sales list

  As Operations lead, Front-desk supervisor
  I want to show manual sales list
  So that they can print the day's manual sales sheet from the print menu

  Background:
    Given staff choose daily operations reports in the print menu

  Scenario: Acceptance criteria
    Then The liquor-charge list appears as a selectable option in the print menu.
    And Selecting it opens the Manual Sales List for the chosen date: each room a guest sleeps in that night, in the lodge's room order, with its guest and, in small type under the room, its reservation number.
    And A room checking out that day is left off, as on Access's list; it only mattered on the days before.
    And Beside them is a wide, blank Items column, ruled off from the guest on paper as on screen, each line tall enough to write a room's sales in by hand at busy times, for entering later.
    And The sheet prints Access's line explaining the box beside each reservation number.
    And The sheet carries no charges and no room order column.
    And Cancelled reservations are left off; Show cancelled adds them back, each with a ticked box beside its reservation number where the others have an empty one.
