# id: itHhh90ZvbGpP4YyacMC
@persona:operations-lead @persona:front-desk-supervisor @status:done @priority:3 @print @charges @liquor
Feature: show manual sales list

  As Operations lead, Front-desk supervisor
  I want to show manual sales list
  So that so that they can produce the internal manual sales list output from the correct report path

  Background:
    Given when staff choose daily operations reports in the print menu

  Scenario: Acceptance criteria
    Then The liquor-charge list appears as a selectable option in the print menu.
    And Selecting the liquor-charge list opens the expected charge list for printing.
    And The output supports staff review of liquor-related charges for the day.
