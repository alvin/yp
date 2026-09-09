@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @charges @ledger @pricing
Feature: find charge items by code

  As Reservation clerk, Front-desk supervisor
  I want to find charge items by code
  So that an item is charged by typing its code instead of scrolling the whole price list

  Background:
    Given staff add a charge line and pick from the items to be charged

  Scenario: Acceptance criteria
    Then The items to be charged are listed in item-code order.
    And The list can be narrowed by typing any part of an entry, without leaving the dropdown.
    And Entries starting with what was typed are listed first — "L" brings the liquor codes to the top.
    And Items can also be found by their description when the code is not known.
    And Choosing an item brings its list price onto the charge line.
    And The same dropdown is used wherever a long list is chosen from, including rooms.
