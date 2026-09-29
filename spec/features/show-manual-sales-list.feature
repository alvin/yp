# id: itHhh90ZvbGpP4YyacMC
@persona:operations-lead @persona:front-desk-supervisor @status:done @priority:3 @print @charges @liquor
Feature: show manual sales list

  As Operations lead, Front-desk supervisor
  I want to show manual sales list
  So that they can print the day's manual sales sheet from the print menu

  Background:
    Given staff choose daily operations reports in the print menu

  Scenario: Acceptance criteria
    Then The liquor-charge list appears as a selectable option in the print menu.
    And Selecting it opens the Manual Sales List for the chosen date: each occupied room in room order, with its reservation number and guest.
    And The sheet carries no charges; staff fill it in by hand, as on the lodge's original.
