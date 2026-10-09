@persona:front-desk-supervisor @status:done @priority:4 @daily-cash @appendix @items @quantity
Feature: show quantity per item in items-cashed-out appendix

  As Front-desk supervisor
  I want to show quantity per item in items-cashed-out appendix
  So that the quantity for each item is visible for checking

  Background:
    Given a front-desk supervisor reviews the items-cashed-out appendix

  Scenario: Acceptance criteria
    Then Each item shows a quantity in the appendix.
    And The quantity is visible alongside the item entry.
    And The appendix can be used to confirm what was cashed out.
    And An item is listed on the day it is cashed out, its stay's check-out day, as on the Daily Cash Activity Report.
    And Room nights are not listed: the appendix is the items sold, as in Access, and its total agrees with the report's sales lines other than Room.
    And The quantity is part of the standard report output.
